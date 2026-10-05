import { describe, it, expect } from "vitest";
import { GET as healthHandler } from "@/app/api/health/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as meHandler } from "@/app/api/auth/me/route";

describe("Phase 1: Health & Authentication Integration", () => {
  it("GET /api/health returns 200 and db: ok", async () => {
    const res = await healthHandler();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe("ok");
    expect(json.data.db).toBe("ok");
    expect(json.data.timestamp).toBeDefined();
  });

  it("POST /api/auth/login successfully logs in cutting_supervisor and issues cookie", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "supervisor@apparelflow.demo",
        password: "Supervisor@123",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.email).toBe("supervisor@apparelflow.demo");
    expect(json.data.role).toBe("cutting_supervisor");
    expect(json.data.fullName).toBe("Nimali Perera");

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("af_session=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("POST /api/auth/login returns 401 on wrong password", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "supervisor@apparelflow.demo",
        password: "WrongPassword@999",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("Invalid email or password");
  });

  it("POST /api/auth/login returns generic 401 on non-existent user", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "doesnotexist@apparelflow.demo",
        password: "AnyPassword@123",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("Invalid email or password");
  });

  it("GET /api/auth/me returns 401 when no session cookie is provided", async () => {
    const req = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
    });

    const res = await meHandler(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/auth/me returns user data when valid session cookie is provided", async () => {
    // First login to get cookie
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "verifier@apparelflow.demo",
        password: "Verifier@123",
      }),
    });

    const loginRes = await loginHandler(loginReq);
    expect(loginRes.status).toBe(200);

    const rawCookie = loginRes.headers.get("Set-Cookie");
    const sessionTokenMatch = rawCookie?.match(/af_session=([^;]+)/);
    const sessionCookie = sessionTokenMatch ? sessionTokenMatch[0] : "";

    const meReq = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers: {
        Cookie: sessionCookie,
      },
    });

    const meRes = await meHandler(meReq);
    expect(meRes.status).toBe(200);

    const json = await meRes.json();
    expect(json.data.email).toBe("verifier@apparelflow.demo");
    expect(json.data.role).toBe("cutting_verifier");
    expect(json.data.fullName).toBe("Kasun Fernando");
  });

  it("POST /api/auth/login triggers 429 when rotating X-Forwarded-For headers against same email (M-01)", async () => {
    const targetEmail = "bruteforcetest@apparelflow.demo";
    let lastStatus = 401;

    // Send 16 requests with distinct X-Forwarded-For IPs to test secondary email-level rate limiter
    for (let i = 1; i <= 16; i++) {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `192.168.1.${i}`,
        },
        body: JSON.stringify({
          email: targetEmail,
          password: "WrongPassword@123",
        }),
      });

      const res = await loginHandler(req);
      lastStatus = res.status;
      if (res.status === 429) {
        const json = await res.json();
        expect(json.error.code).toBe("RATE_LIMITED");
        break;
      }
    }

    expect(lastStatus).toBe(429);
  });

  it("POST /api/auth/login rejects oversized password with 400 to prevent bcrypt CPU exhaustion (M-02)", async () => {
    const hugePassword = "A".repeat(500); // Exceeds 128-char limit
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "supervisor@apparelflow.demo",
        password: hugePassword,
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/logout blocks cross-origin requests with 403 Forbidden (M-03)", async () => {
    const req = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://evil-attacker-site.com",
      },
    });

    const res = await logoutHandler(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("POST /api/auth/logout clears session cookie on valid same-origin request", async () => {
    const req = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });

    const res = await logoutHandler(req);
    expect(res.status).toBe(200);

    const cookieHeader = res.headers.get("Set-Cookie");
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain("Max-Age=0");
    expect(cookieHeader).toContain("HttpOnly");
  });

  it("GET /api/auth/me handles malformed URI percent-encoded cookie with 401 instead of 500 error", async () => {
    const req = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers: {
        Cookie: "af_session=%E0%A4%A", // Malformed UTF-8 sequence that throws URIError in decodeURIComponent
      },
    });

    const res = await meHandler(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});
