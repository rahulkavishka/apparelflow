import { describe, it, expect, beforeAll } from "vitest";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { GET as recipesHandler } from "@/app/api/recipes/route";
import { POST as createOrderHandler, GET as listOrdersHandler } from "@/app/api/orders/route";
import { GET as getOrderHandler, PATCH as patchOrderHandler } from "@/app/api/orders/[id]/route";
import { POST as submitOrderHandler } from "@/app/api/orders/[id]/submit/route";

describe("Phase 2: Supervisor & Order Engine Integration", () => {
  let supervisorCookie: string;
  let verifierCookie: string;
  let recipeId: string;
  let createdOrderId: string;

  beforeAll(async () => {
    // 1. Login as supervisor
    const supLogin = await loginHandler(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "supervisor@apparelflow.demo",
          password: "Supervisor@123",
        }),
      })
    );
    const supCookieHeader = supLogin.headers.get("Set-Cookie");
    supervisorCookie = supCookieHeader?.match(/af_session=([^;]+)/)?.[0] || "";

    // 2. Login as verifier
    const verLogin = await loginHandler(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "verifier@apparelflow.demo",
          password: "Verifier@123",
        }),
      })
    );
    const verCookieHeader = verLogin.headers.get("Set-Cookie");
    verifierCookie = verCookieHeader?.match(/af_session=([^;]+)/)?.[0] || "";

    // 3. Fetch recipes to get Casual Blouse ID
    const recRes = await recipesHandler(
      new Request("http://localhost:3000/api/recipes", {
        headers: { Cookie: supervisorCookie },
      })
    );
    const recJson = await recRes.json();
    const blouse = recJson.data.find((r: { recipeCode: string }) => r.recipeCode === "REC-BL01");
    recipeId = blouse.id;
  });

  it("GET /api/recipes returns 200 with components for supervisor", async () => {
    const res = await recipesHandler(
      new Request("http://localhost:3000/api/recipes", {
        headers: { Cookie: supervisorCookie },
      })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.length).toBeGreaterThanOrEqual(2);
    const blouse = json.data.find((r: { recipeCode: string }) => r.recipeCode === "REC-BL01");
    expect(blouse).toBeDefined();
    expect(blouse.components).toHaveLength(5);
  });

  it("POST /api/orders allows supervisor to create order with derived components", async () => {
    const req = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: supervisorCookie,
      },
      body: JSON.stringify({
        recipeId,
        targetQty: 50,
        fabricRollId: "FAB-ROLL-882",
        actualFabricYds: 94.5,
      }),
    });

    const res = await createOrderHandler(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.id).toBeDefined();
    createdOrderId = json.data.id;
    expect(json.data.orderNo).toMatch(/^CUT-\d{6}$/);
    expect(json.data.status).toBe("CUTTING_IN_PROGRESS");
    expect(json.data.targetQty).toBe(50);
    expect(json.data.expectedFabricYds).toBe(90);
    expect(json.data.wastagePctPreview).toBe(5);

    // Verify multiplier output: 50 blouses * 2 cuffs = 100 cuffs
    const cuffs = json.data.expectedComponents.find(
      (c: { componentName: string }) => c.componentName === "Sleeve Cuffs"
    );
    expect(cuffs).toBeDefined();
    expect(cuffs.expectedQty).toBe(100);
  });

  it("POST /api/orders returns 403 Forbidden for non-supervisor roles", async () => {
    const req = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: verifierCookie,
      },
      body: JSON.stringify({
        recipeId,
        targetQty: 50,
        fabricRollId: "FAB-ROLL-882",
        actualFabricYds: 94.5,
      }),
    });

    const res = await createOrderHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("GET /api/orders lists orders for cutting supervisor", async () => {
    const req = new Request("http://localhost:3000/api/orders", {
      headers: { Cookie: supervisorCookie },
    });

    const res = await listOrdersHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.orders.length).toBeGreaterThan(0);
    const found = json.data.orders.find((o: { id: string }) => o.id === createdOrderId);
    expect(found).toBeDefined();
  });

  it("PATCH /api/orders/:id updates target quantity and recalculates expected items", async () => {
    const req = new Request(`http://localhost:3000/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: supervisorCookie,
      },
      body: JSON.stringify({
        targetQty: 60,
      }),
    });

    const res = await patchOrderHandler(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(200);

    // Verify items were updated: 60 garments * 2 cuffs = 120 cuffs
    const detailReq = new Request(`http://localhost:3000/api/orders/${createdOrderId}`, {
      headers: { Cookie: supervisorCookie },
    });
    const detailRes = await getOrderHandler(detailReq, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    const detailJson = await detailRes.json();
    expect(detailJson.data.targetQty).toBe(60);
    const cuffs = detailJson.data.items.find(
      (i: { componentName: string }) => i.componentName === "Sleeve Cuffs"
    );
    expect(cuffs.expectedQty).toBe(120);
  });

  it("POST /api/orders/:id/submit transitions order to PENDING_VERIFICATION", async () => {
    const req = new Request(`http://localhost:3000/api/orders/${createdOrderId}/submit`, {
      method: "POST",
      headers: { Cookie: supervisorCookie },
    });

    const res = await submitOrderHandler(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe("PENDING_VERIFICATION");
    expect(json.data.submittedAt).toBeDefined();
  });

  it("PATCH /api/orders/:id returns 409 Conflict after order has been submitted", async () => {
    const req = new Request(`http://localhost:3000/api/orders/${createdOrderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: supervisorCookie,
      },
      body: JSON.stringify({
        targetQty: 70,
      }),
    });

    const res = await patchOrderHandler(req, {
      params: Promise.resolve({ id: createdOrderId }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_STATE_TRANSITION");
  });
});
