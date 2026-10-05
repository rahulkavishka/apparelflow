import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { signSessionToken } from "@/lib/auth/jwt";
import { OrderStatus, Decision } from "@prisma/client";
import { GET as getSewingQueue } from "@/app/api/sewing/queue/route";
import { GET as getSewingOrderDetail } from "@/app/api/sewing/orders/[id]/route";
import { POST as postStartAssembly } from "@/app/api/sewing/orders/[id]/start/route";

describe("Phase 4: Sewing Queue Isolation & Start Assembly (T5)", () => {
  let sewingCookie: string;
  let supervisorCookie: string;
  let verifierCookie: string;
  let sewingUser: { id: string; fullName: string; email: string };

  let inProgressOrderId: string;
  let pendingOrderId: string;
  let rejectedOrderId: string;
  let verifiedOrderId: string;

  beforeAll(async () => {
    // 1. Fetch seeded users
    const sewing = await prisma.user.findUniqueOrThrow({
      where: { email: "sewing@apparelflow.demo" },
    });
    sewingUser = sewing;
    const sewToken = await signSessionToken(sewing.id);
    sewingCookie = `af_session=${sewToken}`;

    const supervisor = await prisma.user.findUniqueOrThrow({
      where: { email: "supervisor@apparelflow.demo" },
    });
    const supToken = await signSessionToken(supervisor.id);
    supervisorCookie = `af_session=${supToken}`;

    const verifier = await prisma.user.findUniqueOrThrow({
      where: { email: "verifier@apparelflow.demo" },
    });
    const verToken = await signSessionToken(verifier.id);
    verifierCookie = `af_session=${verToken}`;

    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { recipeCode: "REC-BL01" },
      include: { components: true },
    });

    const timestamp = Date.now();

    // 2. Create one order per status:
    // a) CUTTING_IN_PROGRESS
    const inProgress = await prisma.cuttingOrder.create({
      data: {
        recipeId: recipe.id,
        targetQty: 20,
        fabricRollId: "ROLL-INP-1",
        actualFabricYds: 36.0,
        status: OrderStatus.CUTTING_IN_PROGRESS,
        createdById: supervisor.id,
        orderNo: `CUT-INP-${timestamp}`,
      },
    });
    inProgressOrderId = inProgress.id;

    // b) PENDING_VERIFICATION
    const pending = await prisma.cuttingOrder.create({
      data: {
        recipeId: recipe.id,
        targetQty: 25,
        fabricRollId: "ROLL-PEND-1",
        actualFabricYds: 45.0,
        status: OrderStatus.PENDING_VERIFICATION,
        submittedAt: new Date(),
        createdById: supervisor.id,
        orderNo: `CUT-PEND-${timestamp}`,
      },
    });
    pendingOrderId = pending.id;

    // c) REJECTED
    const rejected = await prisma.cuttingOrder.create({
      data: {
        recipeId: recipe.id,
        targetQty: 30,
        fabricRollId: "ROLL-REJ-1",
        actualFabricYds: 54.0,
        status: OrderStatus.REJECTED,
        submittedAt: new Date(),
        createdById: supervisor.id,
        orderNo: `CUT-REJ-${timestamp}`,
        logs: {
          create: {
            verifierId: verifier.id,
            decision: Decision.REJECTED,
            rejectionNote: "Front body panel has weaving faults.",
            wastagePct: 0.0,
            varianceSnapshot: [],
          },
        },
      },
    });
    rejectedOrderId = rejected.id;

    // d) VERIFIED
    const verified = await prisma.cuttingOrder.create({
      data: {
        recipeId: recipe.id,
        targetQty: 40,
        fabricRollId: "ROLL-VER-1",
        actualFabricYds: 72.0,
        status: OrderStatus.VERIFIED,
        submittedAt: new Date(),
        verifiedAt: new Date(),
        createdById: supervisor.id,
        orderNo: `CUT-VER-${timestamp}`,
        items: {
          create: recipe.components.map((c) => ({
            componentId: c.id,
            expectedQty: 40 * c.piecesPerGarment,
            actualQty: 40 * c.piecesPerGarment,
          })),
        },
        logs: {
          create: {
            verifierId: verifier.id,
            decision: Decision.APPROVED,
            rejectionNote: null,
            wastagePct: 0.0,
            varianceSnapshot: recipe.components.map((c) => ({
              componentId: c.id,
              name: c.componentName,
              piecesPerGarment: c.piecesPerGarment,
              expected: 40 * c.piecesPerGarment,
              actual: 40 * c.piecesPerGarment,
              variance: 0,
              status: "MATCH",
            })),
          },
        },
      },
    });
    verifiedOrderId = verified.id;
  }, 30000);

  const createReq = (
    url: string,
    method: string,
    cookie?: string,
    body?: any
  ): Request => {
    const headers = new Headers();
    if (cookie) {
      headers.set("Cookie", cookie);
    }
    if (body) {
      headers.set("Content-Type", "application/json");
    }

    return new Request(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it("T5: Sewing queue query returns ONLY VERIFIED orders", async () => {
    const req = createReq("/api/sewing/queue", "GET", sewingCookie);
    const res = await getSewingQueue(req, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    const orders = json.data.orders;
    expect(orders.length).toBeGreaterThan(0);

    // Assert that every single returned order is strictly VERIFIED
    for (const o of orders) {
      expect(o.status).toBe("VERIFIED");
    }

    const foundVerified = orders.some((o: any) => o.id === verifiedOrderId);
    expect(foundVerified).toBe(true);

    // Assert unapproved orders are NEVER in the sewing queue
    const foundPending = orders.some((o: any) => o.id === pendingOrderId);
    const foundRejected = orders.some((o: any) => o.id === rejectedOrderId);
    const foundInProgress = orders.some((o: any) => o.id === inProgressOrderId);

    expect(foundPending).toBe(false);
    expect(foundRejected).toBe(false);
    expect(foundInProgress).toBe(false);
  });

  it("T5: URL parameter tampering cannot widen the query to leak non-VERIFIED orders", async () => {
    const attackUrls = [
      `/api/sewing/queue?status=PENDING_VERIFICATION`,
      `/api/sewing/queue?status=REJECTED`,
      `/api/sewing/queue?status=CUTTING_IN_PROGRESS`,
      `/api/sewing/queue?status=ALL`,
      `/api/sewing/queue?status=VERIFIED&status=PENDING_VERIFICATION`,
    ];

    for (const url of attackUrls) {
      const req = createReq(url, "GET", sewingCookie);
      const res = await getSewingQueue(req, {} as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      for (const o of json.data.orders) {
        expect(o.status).toBe("VERIFIED");
      }
    }
  });

  it("T5: Looking up unverified orders returns 404 Not Found (no info disclosure)", async () => {
    // Attempt to view PENDING_VERIFICATION order
    const pendReq = createReq(`/api/sewing/orders/${pendingOrderId}`, "GET", sewingCookie);
    const pendRes = await getSewingOrderDetail(pendReq, {
      params: Promise.resolve({ id: pendingOrderId }),
    });
    expect(pendRes.status).toBe(404);

    // Attempt to view REJECTED order
    const rejReq = createReq(`/api/sewing/orders/${rejectedOrderId}`, "GET", sewingCookie);
    const rejRes = await getSewingOrderDetail(rejReq, {
      params: Promise.resolve({ id: rejectedOrderId }),
    });
    expect(rejRes.status).toBe(404);

    // Attempt to view CUTTING_IN_PROGRESS order
    const inpReq = createReq(`/api/sewing/orders/${inProgressOrderId}`, "GET", sewingCookie);
    const inpRes = await getSewingOrderDetail(inpReq, {
      params: Promise.resolve({ id: inProgressOrderId }),
    });
    expect(inpRes.status).toBe(404);
  });

  it("GET /api/sewing/orders/:id returns full verified specification for VERIFIED batch", async () => {
    const req = createReq(`/api/sewing/orders/${verifiedOrderId}`, "GET", sewingCookie);
    const res = await getSewingOrderDetail(req, {
      params: Promise.resolve({ id: verifiedOrderId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe(verifiedOrderId);
    expect(json.data.status).toBe("VERIFIED");
    expect(json.data.verifier).toBeDefined();
    expect(json.data.items).toHaveLength(5);
  });

  it("POST /api/sewing/orders/:id/start begins assembly and preserves VERIFIED status", async () => {
    const req = createReq(`/api/sewing/orders/${verifiedOrderId}/start`, "POST", sewingCookie);
    const res = await postStartAssembly(req, {
      params: Promise.resolve({ id: verifiedOrderId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe("VERIFIED"); // D-02: Status remains VERIFIED
    expect(json.data.sewingStartedAt).toBeDefined();
    expect(json.data.sewingStartedBy).toBe(sewingUser.fullName);

    // Verify database record
    const updated = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: verifiedOrderId },
    });
    expect(updated.status).toBe(OrderStatus.VERIFIED);
    expect(updated.sewingStartedAt).not.toBeNull();
    expect(updated.sewingStartedBy).toBe(sewingUser.id);
  });

  it("Starting sewing assembly a second time returns 409 Conflict", async () => {
    const req = createReq(`/api/sewing/orders/${verifiedOrderId}/start`, "POST", sewingCookie);
    const res = await postStartAssembly(req, {
      params: Promise.resolve({ id: verifiedOrderId }),
    });
    expect(res.status).toBe(409);
  });

  it("Non-sewing supervisor roles receive 403 Forbidden on sewing endpoints", async () => {
    // Supervisor on sewing queue
    const supReq = createReq("/api/sewing/queue", "GET", supervisorCookie);
    const supRes = await getSewingQueue(supReq, {} as any);
    expect(supRes.status).toBe(403);

    // Verifier on sewing queue
    const verReq = createReq("/api/sewing/queue", "GET", verifierCookie);
    const verRes = await getSewingQueue(verReq, {} as any);
    expect(verRes.status).toBe(403);

    // Anonymous on sewing queue
    const anonReq = createReq("/api/sewing/queue", "GET");
    const anonRes = await getSewingQueue(anonReq, {} as any);
    expect(anonRes.status).toBe(401);
  });
});
