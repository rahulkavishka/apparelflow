// ApparelFlow ERP — Cross-Platform Security Regression Test Runner
// Validates all STRIDE security controls against a live server.

const BASE = process.env.BASE || "http://localhost:3000";

console.log(`Running ApparelFlow Security Regression against: ${BASE}`);
console.log("--------------------------------------------------------");

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email} with status ${res.status}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error(`No cookie returned for ${email}`);
  }
  // Extract af_session cookie value
  const match = setCookie.match(/af_session=([^;]+)/);
  return match ? `af_session=${match[1]}` : "";
}

async function run() {
  console.log("1. Authenticating test personas...");
  const supCookie = await login("supervisor@apparelflow.demo", "Supervisor@123");
  const verCookie = await login("verifier@apparelflow.demo", "Verifier@123");
  const sewCookie = await login("sewing@apparelflow.demo", "Sewing@123");
  console.log("✔ Personas authenticated successfully.\n");

  const dummyId = "00000000-0000-0000-0000-000000000000";

  const checks = [
    {
      title: "Check 01: Anonymous approval blocked",
      url: `/api/verification/orders/${dummyId}/approve`,
      method: "POST",
      cookie: null,
      expected: 401,
    },
    {
      title: "Check 02: Supervisor approval blocked (RBAC)",
      url: `/api/verification/orders/${dummyId}/approve`,
      method: "POST",
      cookie: supCookie,
      expected: 403,
    },
    {
      title: "Check 03: Sewing approval blocked (RBAC)",
      url: `/api/verification/orders/${dummyId}/approve`,
      method: "POST",
      cookie: sewCookie,
      expected: 403,
    },
    {
      title: "Check 04: Verifier cannot create cutting order",
      url: `/api/orders`,
      method: "POST",
      cookie: verCookie,
      body: {
        recipeId: dummyId,
        targetQty: 50,
        fabricRollId: "ROLL-1",
        actualFabricYds: 50,
      },
      expected: 403,
    },
    {
      title: "Check 05: Supervisor cannot access sewing queue",
      url: `/api/sewing/queue`,
      method: "GET",
      cookie: supCookie,
      expected: 403,
    },
    {
      title: "Check 06: Reject without note rejected",
      url: `/api/verification/orders/${dummyId}/reject`,
      method: "POST",
      cookie: verCookie,
      body: {},
      expected: 400,
    },
    {
      title: "Check 07: Reject with note < 5 chars rejected",
      url: `/api/verification/orders/${dummyId}/reject`,
      method: "POST",
      cookie: verCookie,
      body: { note: "bad" },
      expected: 400,
    },
    {
      title: "Check 08: Injected status in order PATCH",
      url: `/api/orders/${dummyId}`,
      method: "PATCH",
      cookie: supCookie,
      body: { status: "VERIFIED" },
      expected: 400,
    },
    {
      title: "Check 09: Negative physical count rejected",
      url: `/api/verification/orders/${dummyId}/counts`,
      method: "PUT",
      cookie: verCookie,
      body: { counts: [{ componentId: dummyId, actualQty: -5 }] },
      expected: 400,
    },
    {
      title: "Check 10: Float physical count rejected",
      url: `/api/verification/orders/${dummyId}/counts`,
      method: "PUT",
      cookie: verCookie,
      body: { counts: [{ componentId: dummyId, actualQty: 12.5 }] },
      expected: 400,
    },
    {
      title: "Check 11: Tampered/forged session cookie",
      url: `/api/auth/me`,
      method: "GET",
      cookie: "af_session=tampered.jwt.signature",
      expected: 401,
    },
    {
      title: "Check 12: Sewing lookup on unverified order",
      url: `/api/sewing/orders/${dummyId}`,
      method: "GET",
      cookie: sewCookie,
      expected: 404,
    },
  ];

  let passed = 0;
  for (const c of checks) {
    const headers = {};
    if (c.cookie) headers["Cookie"] = c.cookie;
    if (c.body) headers["Content-Type"] = "application/json";

    const res = await fetch(`${BASE}${c.url}`, {
      method: c.method,
      headers,
      body: c.body ? JSON.stringify(c.body) : undefined,
    });

    const isMatch = res.status === c.expected;
    if (isMatch) passed++;
    const mark = isMatch ? "\x1b[32m[PASS]\x1b[0m" : `\x1b[31m[FAIL - Got ${res.status}]\x1b[0m`;
    console.log(`${c.title.padEnd(52)} (Expect ${c.expected}): ${mark}`);
  }

  // Check 13: Sewing queue query parameter tamper fuzz
  const sewingRes = await fetch(`${BASE}/api/sewing/queue?status=PENDING_VERIFICATION`, {
    headers: { Cookie: sewCookie },
  });
  const sewingData = await sewingRes.json();
  const leaked = (sewingData.data?.orders || []).some(
    (o) => o.status !== "VERIFIED"
  );
  if (!leaked) {
    passed++;
    console.log(
      `${"Check 13: Sewing queue param tamper fuzz".padEnd(52)} (Verified only): \x1b[32m[PASS]\x1b[0m`
    );
  } else {
    console.log(
      `${"Check 13: Sewing queue param tamper fuzz".padEnd(52)} (Verified only): \x1b[31m[FAIL]\x1b[0m`
    );
  }

  console.log("--------------------------------------------------------");
  console.log(`Results: ${passed} of ${checks.length + 1} checks passed.`);

  if (passed === checks.length + 1) {
    console.log("\x1b[32m✔ All security regression checks PASSED.\x1b[0m");
    process.exit(0);
  } else {
    console.log("\x1b[31m✖ Some security regression checks FAILED.\x1b[0m");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
