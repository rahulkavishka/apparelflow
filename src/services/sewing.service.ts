import { prisma } from "@/lib/db";
import { OrderStatus, Decision } from "@prisma/client";
import { Actor } from "@/lib/auth/session";
import { NotFoundError, ConflictError } from "@/lib/errors";

export interface SewingQueueItemDto {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  status: OrderStatus;
  recipe: {
    recipeCode: string;
    name: string;
    wastageCap: number;
  };
  verifiedAt: string | null;
  verifier: {
    id: string;
    fullName: string;
  } | null;
  wastagePct: number | null;
  sewingStartedAt: string | null;
  sewingStartedBy: {
    id: string;
    fullName: string;
  } | null;
}

export interface SewingOrderDetailDto {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  expectedFabricYds: number;
  status: OrderStatus;
  recipe: {
    id: string;
    recipeCode: string;
    name: string;
    category: string;
    stdFabricYards: number;
    wastageCap: number;
  };
  verifiedAt: string | null;
  verifier: {
    id: string;
    fullName: string;
  } | null;
  wastagePct: number;
  rejectionHistoryCount: number;
  sewingStartedAt: string | null;
  sewingStartedBy: {
    id: string;
    fullName: string;
  } | null;
  items: Array<{
    componentId: string;
    name: string;
    piecesPerGarment?: number;
    expected: number;
    actual: number | null;
    variance: number | null;
    status: "MATCH" | "EXCESS" | "SHORT" | "NOT_COUNTED" | null;
  }>;
}

export interface ListSewingQueueOpts {
  q?: string;
  startedFilter?: "all" | "awaiting" | "started";
  sort?: "verifiedAt" | "orderNo" | "targetQty";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * Lists VERIFIED orders for the sewing queue.
 *
 * CRITICAL SECURITY INVARIANT (SR-03 / T5):
 * The database query enforces WHERE status = 'VERIFIED' literally.
 * No query parameter or client input can override or widen this filter.
 */
export async function listSewingQueue(query?: ListSewingQueueOpts) {
  const filter = query?.startedFilter || "all";
  const page = Math.max(1, query?.page || 1);
  const pageSize = Math.min(query?.pageSize || 20, 50);
  const skip = (page - 1) * pageSize;

  const baseWhere: Record<string, unknown> = {
    status: OrderStatus.VERIFIED, // Hard-coded literal status (SR-03)
  };

  if (query?.q) {
    baseWhere.OR = [
      { orderNo: { contains: query.q, mode: "insensitive" } },
      { fabricRollId: { contains: query.q, mode: "insensitive" } },
      { recipe: { name: { contains: query.q, mode: "insensitive" } } },
      { recipe: { recipeCode: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  const where = {
    ...baseWhere,
    ...(filter === "awaiting" ? { sewingStartedAt: null } : {}),
    ...(filter === "started" ? { sewingStartedAt: { not: null } } : {}),
  };

  let orderBy: Record<string, "asc" | "desc"> = { verifiedAt: "desc" };
  const direction = query?.dir || "desc";
  if (query?.sort === "orderNo") orderBy = { orderNo: direction };
  else if (query?.sort === "targetQty") orderBy = { targetQty: direction };
  else if (query?.sort === "verifiedAt") orderBy = { verifiedAt: direction };

  const [orders, total, awaitingCount, startedCount, allCount] = await Promise.all([
    prisma.cuttingOrder.findMany({
      where,
      select: {
        id: true,
        orderNo: true,
        targetQty: true,
        fabricRollId: true,
        status: true,
        verifiedAt: true,
        sewingStartedAt: true,
        recipe: {
          select: {
            recipeCode: true,
            name: true,
            wastageCap: true,
          },
        },
        sewingBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        logs: {
          where: { decision: Decision.APPROVED },
          orderBy: { timestamp: "desc" },
          take: 1,
          select: {
            wastagePct: true,
            timestamp: true,
            verifier: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.cuttingOrder.count({ where }),
    prisma.cuttingOrder.count({ where: { ...baseWhere, sewingStartedAt: null } }),
    prisma.cuttingOrder.count({ where: { ...baseWhere, sewingStartedAt: { not: null } } }),
    prisma.cuttingOrder.count({ where: baseWhere }),
  ]);

  const formattedOrders: SewingQueueItemDto[] = orders.map((o) => {
    const approvedLog = o.logs[0] || null;
    return {
      id: o.id,
      orderNo: o.orderNo,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      status: o.status,
      recipe: {
        recipeCode: o.recipe.recipeCode,
        name: o.recipe.name,
        wastageCap: Number(o.recipe.wastageCap),
      },
      verifiedAt: o.verifiedAt
        ? o.verifiedAt.toISOString()
        : approvedLog
        ? approvedLog.timestamp.toISOString()
        : null,
      verifier: approvedLog ? approvedLog.verifier : null,
      wastagePct: approvedLog ? Number(approvedLog.wastagePct) : null,
      sewingStartedAt: o.sewingStartedAt ? o.sewingStartedAt.toISOString() : null,
      sewingStartedBy: o.sewingBy,
    };
  });

  return {
    orders: formattedOrders,
    total,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      counts: {
        awaiting: awaitingCount,
        started: startedCount,
        all: allCount,
      },
    },
  };
}

/**
 * Gets a single order for the Sewing detail view.
 *
 * CRITICAL SECURITY INVARIANT (D-13 / T5):
 * Non-VERIFIED orders return 404 Not Found to prevent information disclosure.
 */
export async function getSewingOrder(orderId: string): Promise<SewingOrderDetailDto> {
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      sewingBy: { select: { id: true, fullName: true } },
      logs: {
        orderBy: { timestamp: "desc" },
        include: {
          verifier: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  if (!order || order.status !== OrderStatus.VERIFIED) {
    throw new NotFoundError("Verified cutting order not found in sewing queue.");
  }

  const approvedLog = order.logs.find((l) => l.decision === Decision.APPROVED);
  const rejectionCount = order.logs.filter((l) => l.decision === Decision.REJECTED).length;

  const rawSnapshot = approvedLog?.varianceSnapshot;
  const items = Array.isArray(rawSnapshot)
    ? (rawSnapshot as any[]).map((i) => ({
        componentId: String(i.componentId || ""),
        name: String(i.name || ""),
        piecesPerGarment: i.piecesPerGarment ? Number(i.piecesPerGarment) : undefined,
        expected: Number(i.expected || 0),
        actual: i.actual !== null && i.actual !== undefined ? Number(i.actual) : null,
        variance: i.variance !== null && i.variance !== undefined ? Number(i.variance) : null,
        status: (i.status as "MATCH" | "EXCESS" | "SHORT" | "NOT_COUNTED") || null,
      }))
    : [];

  const actualFabric = Number(order.actualFabricYds);
  const stdFabric = Number(order.recipe.stdFabricYards);
  const expFabric = order.targetQty * stdFabric;

  return {
    id: order.id,
    orderNo: order.orderNo,
    targetQty: order.targetQty,
    fabricRollId: order.fabricRollId,
    actualFabricYds: actualFabric,
    expectedFabricYds: expFabric,
    status: order.status,
    recipe: {
      id: order.recipe.id,
      recipeCode: order.recipe.recipeCode,
      name: order.recipe.name,
      category: order.recipe.category,
      stdFabricYards: stdFabric,
      wastageCap: Number(order.recipe.wastageCap),
    },
    verifiedAt: order.verifiedAt
      ? order.verifiedAt.toISOString()
      : approvedLog
      ? approvedLog.timestamp.toISOString()
      : null,
    verifier: approvedLog ? approvedLog.verifier : null,
    wastagePct: approvedLog ? Number(approvedLog.wastagePct) : 0,
    rejectionHistoryCount: rejectionCount,
    sewingStartedAt: order.sewingStartedAt ? order.sewingStartedAt.toISOString() : null,
    sewingStartedBy: order.sewingBy,
    items,
  };
}

/**
 * Starts sewing assembly for an order.
 *
 * DESIGN DECISION D-02:
 * Sets sewingStartedAt and sewingStartedBy.
 * Status remains VERIFIED to preserve literal queue filtering.
 */
export async function startSewingAssembly(orderId: string, actor: Actor) {
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
  });

  if (!order || order.status !== OrderStatus.VERIFIED) {
    throw new NotFoundError("Verified cutting order not found in sewing queue.");
  }

  if (order.sewingStartedAt !== null) {
    throw new ConflictError(
      "SEWING_ALREADY_STARTED",
      "Sewing assembly has already been started for this order."
    );
  }

  const now = new Date();

  const updated = await prisma.cuttingOrder.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.VERIFIED,
      sewingStartedAt: null,
    },
    data: {
      sewingStartedAt: now,
      sewingStartedBy: actor.id,
    },
  });

  if (updated.count === 0) {
    throw new ConflictError(
      "SEWING_ALREADY_STARTED",
      "Sewing assembly was started concurrently by another operator."
    );
  }

  return {
    orderId,
    status: OrderStatus.VERIFIED,
    sewingStartedAt: now.toISOString(),
    sewingStartedBy: actor.fullName,
  };
}
