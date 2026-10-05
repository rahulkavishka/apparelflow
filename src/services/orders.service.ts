import { OrderStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { Actor } from "@/lib/auth/session";
import { calculateExpectedPieces, deriveExpectedComponents } from "@/domain/multiplier";
import { expectedFabric, wastagePct } from "@/domain/wastage";
import { CreateOrderInput, PatchOrderInput } from "@/validators/order.schema";
import { randomUUID } from "crypto";

export async function createCuttingOrder(actor: Actor, input: CreateOrderInput) {
  if (actor.role !== Role.cutting_supervisor) {
    throw new ForbiddenError("Only cutting supervisors can create cutting orders");
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: input.recipeId },
    include: { components: true },
  });

  if (!recipe) {
    throw new NotFoundError("Selected recipe does not exist");
  }

  const expFabric = expectedFabric(input.targetQty, Number(recipe.stdFabricYards));
  const wastagePreview = wastagePct(input.actualFabricYds, expFabric);

  return prisma.$transaction(async (tx) => {
    // 1. Create order record with temp unique orderNo
    const tempOrderNo = `TMP-${randomUUID()}`;
    const order = await tx.cuttingOrder.create({
      data: {
        orderNo: tempOrderNo,
        recipeId: input.recipeId,
        targetQty: input.targetQty,
        fabricRollId: input.fabricRollId,
        actualFabricYds: input.actualFabricYds,
        status: OrderStatus.CUTTING_IN_PROGRESS,
        createdById: actor.id,
      },
    });

    // 2. Format human-readable order number: CUT-000012
    const finalOrderNo = `CUT-${String(order.orderSeq).padStart(6, "0")}`;
    await tx.cuttingOrder.update({
      where: { id: order.id },
      data: { orderNo: finalOrderNo },
    });

    // 3. Derive and create verification items using multiplier engine
    const expectedComponents = deriveExpectedComponents(
      input.targetQty,
      recipe.components.map((c) => ({
        componentId: c.id,
        componentName: c.componentName,
        piecesPerGarment: c.piecesPerGarment,
        imageUrl: c.imageUrl,
      }))
    );

    await tx.verificationItem.createMany({
      data: expectedComponents.map((ec) => ({
        orderId: order.id,
        componentId: ec.componentId,
        expectedQty: ec.expectedQty,
      })),
    });

    return {
      id: order.id,
      orderNo: finalOrderNo,
      status: OrderStatus.CUTTING_IN_PROGRESS,
      recipe: {
        id: recipe.id,
        recipeCode: recipe.recipeCode,
        name: recipe.name,
        category: recipe.category,
        stdFabricYards: Number(recipe.stdFabricYards),
        wastageCap: Number(recipe.wastageCap),
      },
      targetQty: input.targetQty,
      fabricRollId: input.fabricRollId,
      actualFabricYds: input.actualFabricYds,
      expectedFabricYds: expFabric,
      wastagePctPreview: wastagePreview,
      expectedComponents,
      createdById: actor.id,
      createdAt: order.createdAt,
    };
  });
}

export interface ListOrdersOpts {
  status?: OrderStatus;
  recipeId?: string;
  q?: string;
  sort?: "createdAt" | "orderNo" | "targetQty" | "actualFabricYds" | "wastagePct" | "status";
  dir?: "asc" | "desc";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listCuttingOrders(
  actor: Actor,
  opts: ListOrdersOpts = {}
) {
  if (actor.role !== Role.cutting_supervisor) {
    throw new ForbiddenError("Only cutting supervisors can access cutting orders");
  }

  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(opts.pageSize || 20, 50);
  const skip = (page - 1) * pageSize;

  const baseWhere: Record<string, unknown> = {};
  if (opts.recipeId) baseWhere.recipeId = opts.recipeId;
  if (opts.q) {
    baseWhere.OR = [
      { orderNo: { contains: opts.q, mode: "insensitive" } },
      { fabricRollId: { contains: opts.q, mode: "insensitive" } },
      { recipe: { name: { contains: opts.q, mode: "insensitive" } } },
      { recipe: { recipeCode: { contains: opts.q, mode: "insensitive" } } },
    ];
  }
  if (opts.from || opts.to) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.gte = new Date(opts.from);
    if (opts.to) dateFilter.lte = new Date(opts.to);
    baseWhere.createdAt = dateFilter;
  }

  const where = {
    ...baseWhere,
    ...(opts.status ? { status: opts.status } : {}),
  };

  let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
  const direction = opts.dir || "desc";
  if (opts.sort === "orderNo") orderBy = { orderNo: direction };
  else if (opts.sort === "targetQty") orderBy = { targetQty: direction };
  else if (opts.sort === "actualFabricYds") orderBy = { actualFabricYds: direction };
  else if (opts.sort === "status") orderBy = { status: direction };
  else if (opts.sort === "createdAt") orderBy = { createdAt: direction };

  const [orders, total, statusGroups] = await Promise.all([
    prisma.cuttingOrder.findMany({
      where,
      include: {
        recipe: {
          select: { id: true, recipeCode: true, name: true, stdFabricYards: true, wastageCap: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        logs: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: {
            id: true,
            decision: true,
            rejectionNote: true,
            wastagePct: true,
            timestamp: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.cuttingOrder.count({ where }),
    prisma.cuttingOrder.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { status: true },
    }),
  ]);

  const counts: Record<string, number> = {
    ALL: 0,
    CUTTING_IN_PROGRESS: 0,
    PENDING_VERIFICATION: 0,
    REJECTED: 0,
    VERIFIED: 0,
  };
  for (const g of statusGroups) {
    if (g.status in counts) {
      counts[g.status] = g._count.status;
      counts.ALL += g._count.status;
    }
  }

  return {
    orders: orders.map((o) => {
      const expFabric = expectedFabric(o.targetQty, Number(o.recipe.stdFabricYards));
      const wastage = wastagePct(Number(o.actualFabricYds), expFabric);
      const latestLog = o.logs[0] || null;

      return {
        id: o.id,
        orderNo: o.orderNo,
        status: o.status,
        targetQty: o.targetQty,
        fabricRollId: o.fabricRollId,
        actualFabricYds: Number(o.actualFabricYds),
        expectedFabricYds: expFabric,
        wastagePct: wastage,
        recipe: {
          id: o.recipe.id,
          recipeCode: o.recipe.recipeCode,
          name: o.recipe.name,
          wastageCap: Number(o.recipe.wastageCap),
        },
        createdBy: o.createdBy,
        createdAt: o.createdAt,
        submittedAt: o.submittedAt,
        verifiedAt: o.verifiedAt,
        lastRejectionReason:
          o.status === OrderStatus.REJECTED && latestLog ? latestLog.rejectionNote : null,
      };
    }),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      counts,
    },
  };
}

export async function getCuttingOrderById(actor: Actor, orderId: string) {
  if (actor.role !== Role.cutting_supervisor) {
    throw new ForbiddenError("Only cutting supervisors can access cutting order details");
  }

  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: {
        include: { components: true },
      },
      items: {
        include: { component: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
      logs: {
        include: {
          verifier: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Cutting order not found");
  }

  const expFabric = expectedFabric(order.targetQty, Number(order.recipe.stdFabricYards));
  const wastage = wastagePct(Number(order.actualFabricYds), expFabric);

  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    targetQty: order.targetQty,
    fabricRollId: order.fabricRollId,
    actualFabricYds: Number(order.actualFabricYds),
    expectedFabricYds: expFabric,
    wastagePct: wastage,
    recipe: {
      id: order.recipe.id,
      recipeCode: order.recipe.recipeCode,
      name: order.recipe.name,
      category: order.recipe.category,
      stdFabricYards: Number(order.recipe.stdFabricYards),
      wastageCap: Number(order.recipe.wastageCap),
    },
    items: order.items.map((i) => ({
      id: i.id,
      componentId: i.componentId,
      componentName: i.component.componentName,
      piecesPerGarment: i.component.piecesPerGarment,
      imageUrl: i.component.imageUrl,
      expectedQty: i.expectedQty,
      actualQty: i.actualQty,
      status: i.status,
      variance: i.actualQty !== null ? i.actualQty - i.expectedQty : null,
    })),
    createdBy: order.createdBy,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    submittedAt: order.submittedAt,
    verifiedAt: order.verifiedAt,
    logs: order.logs.map((l) => ({
      id: l.id,
      decision: l.decision,
      rejectionNote: l.rejectionNote,
      wastagePct: Number(l.wastagePct),
      timestamp: l.timestamp,
      verifier: l.verifier,
    })),
  };
}

export async function updateCuttingOrder(
  actor: Actor,
  orderId: string,
  input: PatchOrderInput
) {
  if (actor.role !== Role.cutting_supervisor) {
    throw new ForbiddenError("Only cutting supervisors can edit cutting orders");
  }

  return prisma.$transaction(
    async (tx) => {
      const order = await tx.cuttingOrder.findUnique({
        where: { id: orderId },
        include: {
          recipe: { include: { components: true } },
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundError("Cutting order not found");
      }

      if (order.status !== OrderStatus.CUTTING_IN_PROGRESS) {
        throw new ConflictError(
          "INVALID_STATE_TRANSITION",
          `Only orders in CUTTING_IN_PROGRESS can be edited. Current status is ${order.status}`
        );
      }

      // If target quantity changed, update expected quantity on verification items in parallel
      if (input.targetQty !== undefined && input.targetQty !== order.targetQty) {
        const updatePromises = order.items.map((item) => {
          const comp = order.recipe.components.find((c) => c.id === item.componentId);
          if (comp) {
            const newExpected = calculateExpectedPieces(input.targetQty!, comp.piecesPerGarment);
            return tx.verificationItem.update({
              where: { id: item.id },
              data: { expectedQty: newExpected },
            });
          }
          return Promise.resolve();
        });
        await Promise.all(updatePromises);
      }

      const updated = await tx.cuttingOrder.update({
        where: { id: orderId },
        data: {
          ...(input.targetQty !== undefined ? { targetQty: input.targetQty } : {}),
          ...(input.fabricRollId !== undefined ? { fabricRollId: input.fabricRollId } : {}),
          ...(input.actualFabricYds !== undefined ? { actualFabricYds: input.actualFabricYds } : {}),
        },
      });

      return updated;
    },
    { timeout: 15000, maxWait: 10000 }
  );
}

export async function submitCuttingOrder(actor: Actor, orderId: string) {
  if (actor.role !== Role.cutting_supervisor) {
    throw new ForbiddenError("Only cutting supervisors can submit orders for verification");
  }

  const now = new Date();
  const res = await prisma.cuttingOrder.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.CUTTING_IN_PROGRESS,
    },
    data: {
      status: OrderStatus.PENDING_VERIFICATION,
      submittedAt: now,
    },
  });

  if (res.count !== 1) {
    const existing = await prisma.cuttingOrder.findUnique({ where: { id: orderId } });
    if (!existing) throw new NotFoundError("Cutting order not found");
    throw new ConflictError(
      "INVALID_STATE_TRANSITION",
      `Cannot submit order with status ${existing.status}. Expected CUTTING_IN_PROGRESS.`
    );
  }

  return {
    id: orderId,
    status: OrderStatus.PENDING_VERIFICATION,
    submittedAt: now.toISOString(),
  };
}

export async function recutOrder(actor: Actor, orderId: string) {
  if (actor.role !== Role.cutting_supervisor) {
    throw new ForbiddenError("Only cutting supervisors can trigger order re-cut");
  }

  return prisma.$transaction(async (tx) => {
    const res = await tx.cuttingOrder.updateMany({
      where: {
        id: orderId,
        status: OrderStatus.REJECTED,
      },
      data: {
        status: OrderStatus.CUTTING_IN_PROGRESS,
        submittedAt: null,
      },
    });

    if (res.count !== 1) {
      const existing = await tx.cuttingOrder.findUnique({ where: { id: orderId } });
      if (!existing) throw new NotFoundError("Cutting order not found");
      throw new ConflictError(
        "INVALID_STATE_TRANSITION",
        `Cannot re-cut order with status ${existing.status}. Only REJECTED orders can be re-cut.`
      );
    }

    // Reset verification items counts and statuses so Verifier starts clean
    await tx.verificationItem.updateMany({
      where: { orderId },
      data: {
        actualQty: null,
        status: null,
      },
    });

    return tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: { recipe: true },
    });
  });
}
