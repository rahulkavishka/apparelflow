import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { signSessionToken } from "@/lib/auth/jwt";
import { OrderStatus, Decision } from "@prisma/client";
import { GET as getQueue } from "@/app/api/verification/queue/route";
import { GET as getOrder } from "@/app/api/verification/orders/[id]/route";
import { PUT as putCounts } from "@/app/api/verification/orders/[id]/counts/route";
import { POST as postApprove } from "@/app/api/verification/orders/[id]/approve/route";
import { POST as postReject } from "@/app/api/verification/orders/[id]/reject/route";

describe("Phase 3: Verification Terminal & Server Hard Stop (T1 - T4)", () => {
  let verifierCookie: string;
  let supervisorCookie: string;
  let sewingCookie: string;
  let verifierUser: { id: string; email: string; fullName: string };
  let testRecipe: { id: string; components: Array<{ id: string; componentName: string; piecesPerGarment: number }> };
  let testOrderId: string;

  beforeAll(async () => {
    // 1. Fetch seeded users
    const verifier = await prisma.user.findUniqueOrThrow({
      where: { email: "verifier@apparelflow.demo" },
    });
    verifierUser = verifier;
    const vToken = await signSessionToken(verifier.id);
    verifierCookie = `af_session=${vToken}`;

    const supervisor = await prisma.user.findUniqueOrThrow({
      where: { email: "supervisor@apparelflow.demo" },
    });
    const sToken = await signSessionToken(supervisor.id);
    supervisorCookie = `af_session=${sToken}`;

    const sewing = await prisma.user.findUniqueOrThrow({
      where: { email: "sewing@apparelflow.demo" },
    });
    const sewToken = await signSessionToken(sewing.id);
    sewingCookie = `af_session=${sewToken}`;

    // 2. Fetch seeded recipe REC-BL01
    testRecipe = await prisma.recipe.findUniqueOrThrow({
      where: { recipeCode: "REC-BL01" },
      include: { components: true },
    });

    // 3. Create a test cutting order and transition to PENDING_VERIFICATION
    const order = await prisma.cuttingOrder.create({
      data: {
        recipeId: testRecipe.id,
        targetQty: 50,
        fabricRollId: "FAB-ROLL-TEST-VER",
        actualFabricYds: 94.5,
        status: OrderStatus.PENDING_VERIFICATION,
        submittedAt: new Date(),
        createdById: supervisor.id,
        orderNo: `CUT-TEST-VER-${Date.now()}`,
        items: {
          create: testRecipe.components.map((c) => ({
            componentId: c.id,
            expectedQty: 50 * c.piecesPerGarment,
            actualQty: null, // initially uncounted
          })),
        },
      },
    });
    testOrderId = order.id;
  });

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

  it("GET /api/verification/queue returns pending orders for verifier", async () => {
    const req = createReq("/api/verification/queue", "GET", verifierCookie);
    const res = await getQueue(req, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.queue).toBeDefined();
    const found = json.data.queue.find((o: any) => o.id === testOrderId);
    expect(found).toBeDefined();
    expect(found.status).toBe("PENDING_VERIFICATION");
  });

  it("T4: Non-verifier roles receive 403 Forbidden when attempting approve", async () => {
    // Supervisor attempt
    const supReq = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST",
      supervisorCookie
    );
    const supRes = await postApprove(supReq, {
      params: Promise.resolve({ id: testOrderId }),
    });
    expect(supRes.status).toBe(403);

    // Sewing supervisor attempt
    const sewReq = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST",
      sewingCookie
    );
    const sewRes = await postApprove(sewReq, {
      params: Promise.resolve({ id: testOrderId }),
    });
    expect(sewRes.status).toBe(403);

    // Anonymous attempt
    const anonReq = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST"
    );
    const anonRes = await postApprove(anonReq, {
      params: Promise.resolve({ id: testOrderId }),
    });
    expect(anonRes.status).toBe(401);
  });

  it("T2: Approval blocked (422 GATE_UNCOUNTED) when components are uncounted", async () => {
    const req = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST",
      verifierCookie
    );
    const res = await postApprove(req, {
      params: Promise.resolve({ id: testOrderId }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("GATE_UNCOUNTED");
    expect(json.error.details.blockers).toBeDefined();

    // Verify order is still PENDING_VERIFICATION and no log was inserted
    const orderCheck = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: testOrderId },
    });
    expect(orderCheck.status).toBe(OrderStatus.PENDING_VERIFICATION);

    const logCount = await prisma.verificationLog.count({
      where: { orderId: testOrderId },
    });
    expect(logCount).toBe(0);
  });

  it("PUT /api/verification/orders/:id/counts saves counts and computes traffic lights", async () => {
    // Count all items with 1 SHORT component
    const items = await prisma.verificationItem.findMany({
      where: { orderId: testOrderId },
    });

    const countsPayload = {
      counts: items.map((item, idx) => ({
        componentId: item.componentId,
        actualQty: idx === 0 ? item.expectedQty - 2 : item.expectedQty, // 1 shortage
      })),
    };

    const req = createReq(
      `/api/verification/orders/${testOrderId}/counts`,
      "PUT",
      verifierCookie,
      countsPayload
    );
    const res = await putCounts(req, {
      params: Promise.resolve({ id: testOrderId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.summary.counted).toBe(items.length);
    expect(json.data.summary.red).toBe(1);
    expect(json.data.summary.canApprove).toBe(false);
  });

  it("T2: Approval blocked (422 GATE_SHORTAGE) when at least 1 component has a shortage", async () => {
    const req = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST",
      verifierCookie
    );
    const res = await postApprove(req, {
      params: Promise.resolve({ id: testOrderId }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("GATE_SHORTAGE");
    expect(json.error.details.components).toBeDefined();

    // Verify order remains PENDING_VERIFICATION
    const orderCheck = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: testOrderId },
    });
    expect(orderCheck.status).toBe(OrderStatus.PENDING_VERIFICATION);
  });

  it("T3: Rejecting without note or note < 5 chars returns 400 VALIDATION_ERROR", async () => {
    // Missing note
    const emptyReq = createReq(
      `/api/verification/orders/${testOrderId}/reject`,
      "POST",
      verifierCookie,
      {}
    );
    const emptyRes = await postReject(emptyReq, {
      params: Promise.resolve({ id: testOrderId }),
    });
    expect(emptyRes.status).toBe(400);

    // 4-character note
    const shortReq = createReq(
      `/api/verification/orders/${testOrderId}/reject`,
      "POST",
      verifierCookie,
      { note: "bad " }
    );
    const shortRes = await postReject(shortReq, {
      params: Promise.resolve({ id: testOrderId }),
    });
    expect(shortRes.status).toBe(400);
  });

  it("T1: Approval succeeds (200) when all components are MATCH or EXCESS (all >= expected)", async () => {
    // Update all counts to match expected
    const items = await prisma.verificationItem.findMany({
      where: { orderId: testOrderId },
    });

    const allGreenPayload = {
      counts: items.map((item, idx) => ({
        componentId: item.componentId,
        actualQty: idx === 0 ? item.expectedQty + 2 : item.expectedQty, // 1 excess, rest match
      })),
    };

    const putReq = createReq(
      `/api/verification/orders/${testOrderId}/counts`,
      "PUT",
      verifierCookie,
      allGreenPayload
    );
    await putCounts(putReq, { params: Promise.resolve({ id: testOrderId }) });

    // Act: Approve Batch
    const approveReq = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST",
      verifierCookie
    );
    const approveRes = await postApprove(approveReq, {
      params: Promise.resolve({ id: testOrderId }),
    });

    expect(approveRes.status).toBe(200);
    const json = await approveRes.json();
    expect(json.data.status).toBe("VERIFIED");
    expect(json.data.audit.verifierId).toBe(verifierUser.id);
    expect(json.data.audit.verifierName).toBe(verifierUser.fullName);
    expect(json.data.audit.wastagePct).toBeDefined();

    // Verify order is now VERIFIED in database
    const orderCheck = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: testOrderId },
    });
    expect(orderCheck.status).toBe(OrderStatus.VERIFIED);
    expect(orderCheck.verifiedAt).not.toBeNull();

    // Verify immutable APPROVED log was created
    const log = await prisma.verificationLog.findFirstOrThrow({
      where: { orderId: testOrderId },
    });
    expect(log.decision).toBe(Decision.APPROVED);
    expect(log.verifierId).toBe(verifierUser.id);
  });

  it("Double-approve on already verified order returns 409 Conflict", async () => {
    const req = createReq(
      `/api/verification/orders/${testOrderId}/approve`,
      "POST",
      verifierCookie
    );
    const res = await postApprove(req, {
      params: Promise.resolve({ id: testOrderId }),
    });
    expect(res.status).toBe(409);
  });

  it("T3: Rejecting a pending order with valid note transitions to REJECTED and creates log", async () => {
    // Create another order for rejection test
    const rejectOrder = await prisma.cuttingOrder.create({
      data: {
        recipeId: testRecipe.id,
        targetQty: 30,
        fabricRollId: "FAB-ROLL-REJECT-TEST",
        actualFabricYds: 60.0,
        status: OrderStatus.PENDING_VERIFICATION,
        submittedAt: new Date(),
        createdById: verifierUser.id,
        orderNo: `CUT-REJECT-${Date.now()}`,
        items: {
          create: testRecipe.components.map((c) => ({
            componentId: c.id,
            expectedQty: 30 * c.piecesPerGarment,
            actualQty: 30 * c.piecesPerGarment - 2, // short
          })),
        },
      },
    });

    const note = "Cuffs: 2 pieces with fabric flaw, re-cut required.";
    const req = createReq(
      `/api/verification/orders/${rejectOrder.id}/reject`,
      "POST",
      verifierCookie,
      { note }
    );
    const res = await postReject(req, {
      params: Promise.resolve({ id: rejectOrder.id }),
    });

    expect(res.status).toBe(200);

    // Verify order is now REJECTED
    const orderCheck = await prisma.cuttingOrder.findUniqueOrThrow({
      where: { id: rejectOrder.id },
    });
    expect(orderCheck.status).toBe(OrderStatus.REJECTED);

    // Verify REJECTED log is stored with note
    const log = await prisma.verificationLog.findFirstOrThrow({
      where: { orderId: rejectOrder.id },
    });
    expect(log.decision).toBe(Decision.REJECTED);
    expect(log.rejectionNote).toBe(note);
    expect(log.verifierId).toBe(verifierUser.id);
  });

  it("GET /api/verification/queue rejects pageSize > 50 with 400 (M-04)", async () => {
    const req = createReq("/api/verification/queue?pageSize=100", "GET", verifierCookie);
    const res = await getQueue(req, {} as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
