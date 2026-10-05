import { prisma } from "@/lib/db";
import { OrderStatus, Decision } from "@prisma/client";
import { Actor } from "@/lib/auth/session";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  GateError,
} from "@/lib/errors";
import {
  evaluateTrafficLight,
  evaluateVerificationBatch,
} from "@/domain/traffic-light";
import { expectedFabric, wastagePct, isOverWastageCap } from "@/domain/wastage";

export interface VerificationItemDto {
  id: string;
  componentId: string;
  name: string;
  piecesPerGarment: number;
  imageUrl?: string | null;
  expectedQty: number;
  actualQty: number | null;
  status: "MATCH" | "EXCESS" | "SHORT" | "NOT_COUNTED";
  variance: number | null;
  label: string;
}

export interface VerificationOrderDto {
  order: {
    id: string;
    orderNo: string;
    status: OrderStatus;
    targetQty: number;
    fabricRollId: string;
    actualFabricYds: number;
    expectedFabricYds: number;
    wastagePct: number;
    isOverCap: boolean;
    submittedAt: string | null;
    recipe: {
      id: string;
      recipeCode: string;
      name: string;
      category: string;
      stdFabricYards: number;
      wastageCap: number;
    };
    createdBy: {
      id: string;
      fullName: string;
    };
  };
  items: VerificationItemDto[];
  summary: {
    total: number;
    counted: number;
    uncounted: number;
    red: number;
    yellow: number;
    green: number;
    canApprove: boolean;
    blockers: Array<{
      componentId: string;
      componentName: string;
      expectedQty: number;
      actualQty: number | null;
      reason: string;
      message: string;
    }>;
  };
}

export interface ListQueueOpts {
  q?: string;
  sort?: "submittedAt" | "orderNo" | "targetQty";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * Lists all orders awaiting verification (status: PENDING_VERIFICATION) with search, sort, and pagination.
 */
export async function listVerificationQueue(opts: ListQueueOpts = {}) {
  const page = Math.max(1, opts.page || 1);
  const pageSize = opts.pageSize ? Math.min(opts.pageSize, 100) : 50;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    status: OrderStatus.PENDING_VERIFICATION,
  };

  if (opts.q) {
    where.OR = [
      { orderNo: { contains: opts.q, mode: "insensitive" } },
      { fabricRollId: { contains: opts.q, mode: "insensitive" } },
      { recipe: { name: { contains: opts.q, mode: "insensitive" } } },
      { recipe: { recipeCode: { contains: opts.q, mode: "insensitive" } } },
    ];
  }

  let orderBy: Record<string, "asc" | "desc"> = { submittedAt: "asc" };
  const direction = opts.dir || "asc";
  if (opts.sort === "orderNo") orderBy = { orderNo: direction };
  else if (opts.sort === "targetQty") orderBy = { targetQty: direction };
  else if (opts.sort === "submittedAt") orderBy = { submittedAt: direction };

  const [orders, total, garmentsAggregate] = await Promise.all([
    prisma.cuttingOrder.findMany({
      where,
      include: {
        recipe: {
          select: { recipeCode: true, name: true },
        },
        createdBy: {
          select: { fullName: true },
        },
        items: {
          select: { actualQty: true },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.cuttingOrder.count({ where }),
    prisma.cuttingOrder.aggregate({
      where,
      _sum: { targetQty: true },
    }),
  ]);

  const totalGarments = garmentsAggregate._sum.targetQty || 0;

  const queue = orders.map((o) => {
    const totalItems = o.items.length;
    const countedItems = o.items.filter((i) => i.actualQty !== null).length;
    return {
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      submittedAt: o.submittedAt ? o.submittedAt.toISOString() : null,
      recipe: o.recipe,
      createdBy: o.createdBy,
      totalItems,
      countedItems,
    };
  });

  return {
    queue,
    total,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      totalGarments,
    },
  };
}

/**
 * Formats a cutting order and its items into the VerificationOrderDto shape.
 */
function formatVerificationOrder(order: any): VerificationOrderDto {
  const stdFabric = Number(order.recipe.stdFabricYards);
  const actualFabric = Number(order.actualFabricYds);
  const expFabric = expectedFabric(order.targetQty, stdFabric);
  const wastage = expFabric > 0 ? wastagePct(actualFabric, expFabric) : 0;
  const overCap = isOverWastageCap(wastage, Number(order.recipe.wastageCap));

  const itemsDto: VerificationItemDto[] = order.items.map((item: any) => {
    const res = evaluateTrafficLight(item.actualQty, item.expectedQty);
    return {
      id: item.id,
      componentId: item.componentId,
      name: item.component.componentName,
      piecesPerGarment: item.component.piecesPerGarment,
      imageUrl: item.component.imageUrl,
      expectedQty: item.expectedQty,
      actualQty: item.actualQty,
      status: res.status,
      variance: res.variance,
      label: res.label,
    };
  });

  const evaluation = evaluateVerificationBatch(
    order.items.map((i: any) => ({
      componentId: i.componentId,
      componentName: i.component.componentName,
      expectedQty: i.expectedQty,
      actualQty: i.actualQty,
    }))
  );

  return {
    order: {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      targetQty: order.targetQty,
      fabricRollId: order.fabricRollId,
      actualFabricYds: actualFabric,
      expectedFabricYds: expFabric,
      wastagePct: wastage,
      isOverCap: overCap,
      submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
      recipe: {
        id: order.recipe.id,
        recipeCode: order.recipe.recipeCode,
        name: order.recipe.name,
        category: order.recipe.category,
        stdFabricYards: stdFabric,
        wastageCap: Number(order.recipe.wastageCap),
      },
      createdBy: {
        id: order.createdBy.id,
        fullName: order.createdBy.fullName,
      },
    },
    items: itemsDto,
    summary: {
      total: evaluation.totalComponents,
      counted: evaluation.countedComponents,
      uncounted: evaluation.uncountedComponents,
      red: evaluation.shortCount,
      yellow: evaluation.excessCount,
      green: evaluation.matchCount,
      canApprove: evaluation.canApprove,
      blockers: evaluation.blockers,
    },
  };
}

/**
 * Gets a cutting order by ID for verification terminal.
 * Returns 404 if the order does not exist or is not in PENDING_VERIFICATION.
 */
export async function getVerificationOrder(orderId: string): Promise<VerificationOrderDto> {
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      createdBy: { select: { id: true, fullName: true } },
      items: {
        include: { component: true },
        orderBy: { component: { componentName: "asc" } },
      },
    },
  });

  if (!order || order.status !== OrderStatus.PENDING_VERIFICATION) {
    throw new NotFoundError(
      "Cutting order not found or is not currently awaiting verification."
    );
  }

  return formatVerificationOrder(order);
}

/**
 * Saves entered counts for an order's components.
 */
export async function saveCounts(
  orderId: string,
  counts: Array<{ componentId: string; actualQty: number }>,
  _actor: Actor
): Promise<VerificationOrderDto> {
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      createdBy: { select: { id: true, fullName: true } },
      items: {
        include: { component: true },
        orderBy: { component: { componentName: "asc" } },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Cutting order not found.");
  }

  if (order.status !== OrderStatus.PENDING_VERIFICATION) {
    throw new ConflictError(
      "INVALID_STATE_TRANSITION",
      `Cannot update counts: order is in '${order.status}' status.`
    );
  }

  const existingItemMap = new Map(order.items.map((i) => [i.componentId, i]));

  // Validate that all component IDs exist in this order
  for (const c of counts) {
    if (!existingItemMap.has(c.componentId)) {
      throw new BadRequestError(
        `Component ${c.componentId} does not belong to this cutting order.`
      );
    }
  }

  // Update items in parallel batch transaction & update in-memory item values
  await prisma.$transaction(
    counts.map((c) => {
      const item = existingItemMap.get(c.componentId)!;
      const light = evaluateTrafficLight(c.actualQty, item.expectedQty);
      item.actualQty = c.actualQty;
      item.status = light.prismaStatus as any;

      return prisma.verificationItem.update({
        where: { id: item.id },
        data: {
          actualQty: c.actualQty,
          status: light.prismaStatus,
        },
      });
    })
  );

  // Return formatted order directly from in-memory object (eliminates extra network round-trip)
  return formatVerificationOrder(order);
}

/**
 * Server Gatekeeper Hard Stop: Approves a batch if and only if:
 * 1. Order is in PENDING_VERIFICATION
 * 2. Every single component is counted (actualQty !== null)
 * 3. Zero components have a shortage (actualQty >= expectedQty)
 *
 * Persists an immutable audit log and transitions status to VERIFIED atomically.
 */
export async function approveVerificationOrder(
  orderId: string,
  actor: Actor
) {
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      createdBy: { select: { id: true, fullName: true } },
      items: {
        include: { component: true },
        orderBy: { component: { componentName: "asc" } },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Cutting order not found.");
  }

  if (order.status !== OrderStatus.PENDING_VERIFICATION) {
    throw new ConflictError(
      "INVALID_STATE_TRANSITION",
      `Cannot approve order: order is in '${order.status}' status.`
    );
  }

  // Re-evaluate on stored items
  const evaluation = evaluateVerificationBatch(
    order.items.map((i) => ({
      componentId: i.componentId,
      componentName: i.component.componentName,
      expectedQty: i.expectedQty,
      actualQty: i.actualQty,
    }))
  );

  // 1. Hard stop on uncounted
  if (evaluation.uncountedComponents > 0) {
    throw new GateError(
      "GATE_UNCOUNTED",
      "Approval blocked: all components must be counted before approval.",
      { blockers: evaluation.blockers }
    );
  }

  // 2. Hard stop on shortage
  if (evaluation.shortCount > 0) {
    throw new GateError(
      "GATE_SHORTAGE",
      "Approval blocked: 1 or more components have a shortage.",
      { components: evaluation.blockers }
    );
  }

  // 3. Calculate fabric wastage
  const stdFabric = Number(order.recipe.stdFabricYards);
  const actualFabric = Number(order.actualFabricYds);
  const expFabric = expectedFabric(order.targetQty, stdFabric);
  const wastage = expFabric > 0 ? wastagePct(actualFabric, expFabric) : 0;

  // 4. Build immutable variance snapshot
  const snapshot = order.items.map((i) => {
    const light = evaluateTrafficLight(i.actualQty, i.expectedQty);
    return {
      componentId: i.componentId,
      name: i.component.componentName,
      piecesPerGarment: i.component.piecesPerGarment,
      expected: i.expectedQty,
      actual: i.actualQty,
      variance: light.variance,
      status: light.status,
    };
  });

  // 5. Atomic batch transaction: write immutable log + conditional order status update (single round-trip)
  const now = new Date();
  try {
    const [, updated] = await prisma.$transaction([
      prisma.verificationLog.create({
        data: {
          orderId: order.id,
          verifierId: actor.id,
          decision: Decision.APPROVED,
          rejectionNote: null,
          wastagePct: wastage,
          varianceSnapshot: snapshot,
          timestamp: now,
        },
      }),
      prisma.cuttingOrder.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.PENDING_VERIFICATION,
        },
        data: {
          status: OrderStatus.VERIFIED,
          verifiedAt: now,
        },
      }),
    ]);

    if (updated.count === 0) {
      throw new ConflictError(
        "INVALID_STATE_TRANSITION",
        "Order state changed concurrently. Approval aborted."
      );
    }
  } catch (err: any) {
    // Check if Postgres trigger raised gate exception
    if (err.code === "23514" || (err.message && err.message.includes("approval gate"))) {
      throw new GateError(
        "GATE_SHORTAGE",
        "Database gatekeeper trigger refused approval: shortage or uncounted component."
      );
    }
    throw err;
  }

  return {
    orderId: order.id,
    status: OrderStatus.VERIFIED,
    audit: {
      verifierId: actor.id,
      verifierName: actor.fullName,
      timestamp: now.toISOString(),
      wastagePct: wastage,
      variances: snapshot,
    },
  };
}

/**
 * Rejects a cutting order batch.
 * Requires a mandatory rejection reason (5-500 chars).
 * Sets order status to REJECTED and creates an immutable log.
 */
export async function rejectVerificationOrder(
  orderId: string,
  note: string,
  actor: Actor
) {
  const trimmedNote = note.trim();
  if (!trimmedNote || trimmedNote.length < 5 || trimmedNote.length > 500) {
    throw new BadRequestError(
      "Rejection reason must be between 5 and 500 characters."
    );
  }

  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      items: {
        include: { component: true },
        orderBy: { component: { componentName: "asc" } },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Cutting order not found.");
  }

  if (order.status !== OrderStatus.PENDING_VERIFICATION) {
    throw new ConflictError(
      "INVALID_STATE_TRANSITION",
      `Cannot reject order: order is in '${order.status}' status.`
    );
  }

  // Calculate wastage & snapshot for record
  const stdFabric = Number(order.recipe.stdFabricYards);
  const actualFabric = Number(order.actualFabricYds);
  const expFabric = expectedFabric(order.targetQty, stdFabric);
  const wastage = expFabric > 0 ? wastagePct(actualFabric, expFabric) : 0;

  const snapshot = order.items.map((i) => {
    const light = evaluateTrafficLight(i.actualQty, i.expectedQty);
    return {
      componentId: i.componentId,
      name: i.component.componentName,
      piecesPerGarment: i.component.piecesPerGarment,
      expected: i.expectedQty,
      actual: i.actualQty,
      variance: light.variance,
      status: light.status,
    };
  });

  const now = new Date();

  const [, updated] = await prisma.$transaction([
    prisma.verificationLog.create({
      data: {
        orderId: order.id,
        verifierId: actor.id,
        decision: Decision.REJECTED,
        rejectionNote: trimmedNote,
        wastagePct: wastage,
        varianceSnapshot: snapshot,
        timestamp: now,
      },
    }),
    prisma.cuttingOrder.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.PENDING_VERIFICATION,
      },
      data: {
        status: OrderStatus.REJECTED,
      },
    }),
  ]);

  if (updated.count === 0) {
    throw new ConflictError(
      "INVALID_STATE_TRANSITION",
      "Order state changed concurrently. Rejection aborted."
    );
  }

  return {
    orderId: order.id,
    status: OrderStatus.REJECTED,
    rejectionReason: trimmedNote,
    timestamp: now.toISOString(),
  };
}

export interface ListLogsOpts {
  q?: string;
  decision?: "APPROVED" | "REJECTED" | "ALL";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Lists history of past verification decisions with search, decision filter, and pagination.
 */
export async function listVerificationHistory(opts: ListLogsOpts = {}) {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(opts.pageSize || 20, 50);
  const skip = (page - 1) * pageSize;

  const baseWhere: Record<string, unknown> = {};
  if (opts.q) {
    baseWhere.OR = [
      { order: { orderNo: { contains: opts.q, mode: "insensitive" } } },
      { order: { fabricRollId: { contains: opts.q, mode: "insensitive" } } },
      { order: { recipe: { name: { contains: opts.q, mode: "insensitive" } } } },
      { order: { recipe: { recipeCode: { contains: opts.q, mode: "insensitive" } } } },
    ];
  }
  if (opts.from || opts.to) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.gte = new Date(opts.from);
    if (opts.to) dateFilter.lte = new Date(opts.to);
    baseWhere.timestamp = dateFilter;
  }

  const where = {
    ...baseWhere,
    ...(opts.decision && opts.decision !== "ALL" ? { decision: opts.decision } : {}),
  };

  const [logs, total, decisionGroups] = await Promise.all([
    prisma.verificationLog.findMany({
      where,
      include: {
        verifier: {
          select: { id: true, fullName: true, role: true },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            targetQty: true,
            fabricRollId: true,
            status: true,
            recipe: {
              select: { recipeCode: true, name: true, wastageCap: true },
            },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.verificationLog.count({ where }),
    prisma.verificationLog.groupBy({
      by: ["decision"],
      where: baseWhere,
      _count: { decision: true },
    }),
  ]);

  const counts: Record<string, number> = {
    ALL: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  for (const g of decisionGroups) {
    if (g.decision in counts) {
      counts[g.decision] = g._count.decision;
      counts.ALL += g._count.decision;
    }
  }

  const formattedLogs = logs.map((log) => ({
    id: log.id,
    orderId: log.orderId,
    orderNo: log.order.orderNo,
    recipe: {
      recipeCode: log.order.recipe.recipeCode,
      name: log.order.recipe.name,
      wastageCap: Number(log.order.recipe.wastageCap),
    },
    targetQty: log.order.targetQty,
    fabricRollId: log.order.fabricRollId,
    decision: log.decision,
    rejectionNote: log.rejectionNote,
    wastagePct: Number(log.wastagePct),
    varianceSnapshot: log.varianceSnapshot,
    timestamp: log.timestamp.toISOString(),
    verifier: log.verifier,
  }));

  return {
    logs: formattedLogs,
    total,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      counts,
    },
  };
}
