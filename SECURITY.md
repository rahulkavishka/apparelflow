# ApparelFlow ERP — Cutting Operations & Gatekeeper Terminal
## Security Architecture, Threat Model & Hardening Report

---

### 1. Security Overview & Philosophy

ApparelFlow enforces a **Zero-Trust Security Architecture** around the high-stakes cutting-to-sewing boundary in garment manufacturing. The primary business asset protected is **Order Status Integrity**: unverified, defective, or short-count fabric bundles must never breach the sewing assembly line.

Security is implemented using **defense-in-depth** across all architectural tiers:
1. **Edge & Transport Layer:** Hardened HTTP response headers (Content Security Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), server fingerprinting suppression (`poweredByHeader: false`), and CSRF/Origin enforcement (`assertSameOrigin`).
2. **Authentication & Identity Layer:** Cryptographically signed JSON Web Tokens (`HS256`, 256-bit / 64-character hex secret), HttpOnly session cookies, 3-tier brute-force and credential stuffing rate limiting, and 12-round bcrypt password hashing with constant-time dummy timing equalization.
3. **Application & API Guard Layer:** Role-Based Access Control (`withAuth`), strict Zod validation schemas (`.strict()`) with explicit boundaries on all parameters, and non-bypassable server-side validation.
4. **Database & Persistence Layer:** PostgreSQL database triggers enforcing immutable audit logs (`trg_logs_immutable`) and an atomic approval gatekeeper (`trg_approval_gate`) that rejects transactions if uncounted components or shortages exist, combined with Supabase Row-Level Security (RLS) deny-all policies.

---

### 2. STRIDE Threat Model & Security Controls Matrix

| Threat Category | ID | Attack Scenario | Countermeasure & Control | Verification Test |
|---|---|---|---|---|
| **Spoofing** | S1 | Forged JWT, `alg: none`, stolen cookie | `jose.jwtVerify` pinned strictly to `HS256`. 256-bit (64-character) cryptographic secret. Cookie flags `HttpOnly; SameSite=Lax; Path=/` (`Secure` in production). | Expired/forged token $\rightarrow$ `401 Unauthorized` |
| **Spoofing** | S2 | Credential brute-force / password stuffing / IP rotation bypass | bcrypt salt rounds 12. Constant-time dummy comparison (`dummyPasswordCheck` with `DUMMY_HASH`) on non-existent emails. 3-tier rate limiter (IP+Email: 6/min, Account-level Email: 15/min, Global IP: 30/min). | Rotating `X-Forwarded-For` against single email $\rightarrow$ `429 Rate Limited` |
| **Tampering** | T1 | Direct status override (`PATCH /api/orders/:id { status: "VERIFIED" }`) | Zod `.strict()` schemas disallow unexpected keys. Service update methods never accept `status` from request body. | Injected status $\rightarrow$ `400 Validation Error`; order unchanged |
| **Tampering** | T2 | Forged "all-green" approval (`POST /api/verification/orders/:id/approve` with body) | Approve endpoint accepts **no body** (`approveOrderSchema = z.object({}).strict()`). Server loads persisted items and independently derives statuses. | Body sent $\rightarrow$ ignored or re-evaluated; shortages return `422 GATE_SHORTAGE` |
| **Tampering** | T3 | Direct update to audit trail via SQL or ORM | Database trigger `trg_logs_immutable` forbids `UPDATE` or `DELETE` on `verification_logs`. | Direct SQL update $\rightarrow$ PostgreSQL exception (trigger `23514`) |
| **Tampering** | T4 | Verifier identity spoofing (`verifierId` in body) | Field not accepted. Verifier attribution is extracted exclusively from cryptographic session `actor.id`. | Body `verifierId` $\rightarrow$ ignored; log records authenticated session actor |
| **Tampering** | T5 | Race condition bypass (concurrent approval calls) | Prisma interactive transaction, atomic conditional update (`where: { id, status: 'PENDING_VERIFICATION' }`), and database trigger `trg_approval_gate`. | Parallel approvals $\rightarrow$ exactly one succeeds (200), duplicate fails (409) |
| **Repudiation** | R1 | "I never approved that short batch" | Append-only immutable log with foreign key to user ID, server timestamp, wastage %, and component variance snapshot. | Integration test T1 asserts log persistence and session attribution |
| **Information Disclosure** | I1 | Sewing supervisor views unverified batches | Literal SQL query `where: { status: 'VERIFIED' }`. Route parameters like `?status=PENDING` are discarded. Looking up unverified ID returns `404 Not Found`. | Integration test T5 parameter-fuzzing suite |
| **Information Disclosure** | I2 | Password hash leak in user DTOs | Explicit Prisma `select` projections. `passwordHash` is never selected or serialized in JSON responses. | API response shape unit tests |
| **Information Disclosure** | I3 | PostgREST leakage via Supabase anon key | Supabase Row-Level Security (RLS) enabled on all tables with deny-all policy. | Public anon key returns 0 rows |
| **Denial of Service** | D1 | Oversized payload, huge quantities, CPU exhaustion | Server body limit (`100kb`). Password capped at 128 chars and email at 100 chars in Zod schema before bcrypt processing. Maximum `targetQty` capped at 100,000. `pageSize` capped at 50 on all paginated endpoints. | Oversized password (>128 chars) $\rightarrow$ `400 Validation Error` |
| **Elevation of Privilege** | E1 | Supervisor approves verification batch | `withAuth(['cutting_verifier'])` checks active session role before business logic executes. | Supervisor calling approve $\rightarrow$ `403 Forbidden` (Test T4) |
| **Elevation of Privilege** | E2 | Forged role claim inside JWT token | User role is re-queried from database table `users` on every request; token role claims are not trusted (D-10 Zero-Trust Identity Model). 10s server-side cache for hot paths. | Stale or modified JWT role $\rightarrow$ DB role governs access |
| **Elevation of Privilege** | E3 | Recipe mutations (POST / PUT / DELETE) | `withAuth` guards require authentication, and all mutation attempts throw `403 Forbidden` JSON (`"Recipe mutation is not permitted in this system module"`). | Mutation requests $\rightarrow$ `403 Forbidden` JSON |
| **Cross-Site Scripting (XSS)** | E5 | Malicious script payload in rejection note | React JSX automatic escaping; no `dangerouslySetInnerHTML`. Notes rendered as text nodes. Full Content Security Policy header. | XSS string rendered safely as plain text |
| **SQL Injection** | E6 | Malicious SQL payload in `fabricRollId` | Prisma parameterized queries; zero `$queryRawUnsafe`; strict regex pattern `^[A-Z0-9-]{3,40}$`. | SQL injection string $\rightarrow$ `400 Validation Error` |
| **CSRF / Origin Attacks** | C1 | Cross-origin mutation or logout attack | `assertSameOrigin` blocks cross-origin `POST`, `PUT`, `PATCH`, `DELETE` requests; SameSite=Lax cookie attribute. | Cross-origin `POST /api/auth/logout` $\rightarrow$ `403 Forbidden` |

---

### 3. Authentication & Session Security Architecture

#### 3.1 Cryptographic Tokens
- **Algorithm:** Signed using `jose` with `HS256` (HMAC-SHA256).
- **Secret Entropy:** 256-bit (64-character hex) cryptographically generated secret (`JWT_SECRET`), satisfying NIST SP 800-107 recommendations.
- **Payload Structure:**
  - `sub`: User ID (UUID)
  - `email`: User email address
  - `fullName`: User display name
  - `role`: Initial role snapshot (informational)
  - `iat`: Issued-at epoch timestamp
  - `exp`: Expiration timestamp (strictly 8 hours from issue)

#### 3.2 Cookie Transmission Safeguards
- **Name:** `af_session`
- **Max-Age:** `28800` (8 hours)
- **HttpOnly:** `true` (prohibits JavaScript access; mitigates XSS token exfiltration).
- **Secure:** `true` in production (`NODE_ENV === "production"`).
- **SameSite:** `Lax` (prevents cross-site request forgery while preserving seamless top-level navigation).
- **Path:** `/` (scoped to root).

#### 3.3 Zero-Trust Identity Verification (Decision D-10)
- In traditional JWT setups, API routes blindly trust the `role` claim in the decoded payload. If a user's role is revoked or modified, the token remains valid until expiration.
- **ApparelFlow Solution:** The JWT proves *identity* (`payload.sub`), but **authorization roles are re-verified against the database** `users` table on every request.
- **Performance Optimization:** An in-memory cache with a 10-second TTL (`userSessionCache`) eliminates redundant database lookups on hot API paths while ensuring administrative deactivations or role modifications take effect almost immediately. Logging out immediately purges the user's cached session.

#### 3.4 Multi-Tiered Rate Limiting
To prevent credential stuffing, brute-force attacks, and `X-Forwarded-For` header spoofing bypasses, `loginUser` enforces a **3-tier rate limiting strategy**:

```
                               Incoming Login Request
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │  Tier 1: IP + Target Email (6 attempts / min) │
                 └───────────────────────┬───────────────────────┘
                                         │ Pass
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ Tier 2: Account-Level Email (15 att. / min)   │
                 │ (Global across all IPs — stops proxy rotation)│
                 └───────────────────────┬───────────────────────┘
                                         │ Pass
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │  Tier 3: Global IP Limit (30 attempts / min)  │
                 │ (Stops credential stuffing across accounts)   │
                 └───────────────────────┬───────────────────────┘
                                         │ Pass
                                         ▼
                           Verify User & Bcrypt Hash
```

1. **Tier 1 (IP + Email):** 6 attempts/minute per IP and target email.
2. **Tier 2 (Account Email):** 15 attempts/minute per email across all client IPs (neutralizes botnets and rotating proxy attacks).
3. **Tier 3 (Global IP):** 30 attempts/minute per client IP (neutralizes distributed password stuffing).

#### 3.5 Constant-Time Dummy Password Comparison
To eliminate user enumeration via timing attacks:
- When a non-existent email is submitted, the system executes `dummyPasswordCheck(input.password)` using a pre-computed 12-round dummy hash (`DUMMY_HASH`).
- Both valid and non-existent accounts take identical execution time (~80-120ms), revealing zero timing clues to attackers.

---

### 4. Role-Based Access Control (RBAC) Matrix

ApparelFlow enforces strict least-privilege RBAC using the `withAuth` higher-order route guard:

| Endpoint | HTTP Method | Allowed Role(s) | Unauthenticated | Unauthorized Role |
|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Allowed | Allowed |
| `/api/auth/logout` | `POST` | Public / Authenticated | `200 OK` (clears cookie) | Allowed |
| `/api/auth/me` | `GET` | All Authenticated | `401 UNAUTHENTICATED` | Allowed |
| `/api/orders` | `GET` | `cutting_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/orders` | `POST` | `cutting_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/orders/:id` | `GET` | `cutting_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/orders/:id` | `PATCH` | `cutting_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/orders/:id/submit` | `POST` | `cutting_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/verification/queue` | `GET` | `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/verification/orders/:id` | `GET` | `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/verification/orders/:id/counts` | `PUT` | `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/verification/orders/:id/approve` | `POST` | `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/verification/orders/:id/reject` | `POST` | `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/verification/logs` | `GET` | `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/sewing/queue` | `GET` | `sewing_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/sewing/orders/:id` | `GET` | `sewing_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/sewing/orders/:id/start` | `POST` | `sewing_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/recipes` | `GET` | `cutting_supervisor`, `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/recipes` | `POST`, `PUT`, `DELETE` | `cutting_supervisor`, `cutting_verifier`, `sewing_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` (Immutable module) |
| `/api/recipes/:id` | `GET` | `cutting_supervisor`, `cutting_verifier` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` |
| `/api/recipes/:id` | `PUT`, `DELETE` | `cutting_supervisor`, `cutting_verifier`, `sewing_supervisor` | `401 UNAUTHENTICATED` | `403 FORBIDDEN` (Immutable module) |

---

### 5. HTTP Defensive Security Headers

Configured in `next.config.ts` and applied across all routes:

```typescript
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];
```

- **Server Fingerprint Suppression:** `poweredByHeader: false` suppresses the `X-Powered-By: Next.js` response header.
- **Request Body Limits:** `experimental.serverActions.bodySizeLimit: '100kb'` protects against large payload memory exhaustion.

---

### 6. Input Validation & Parameter Boundaries

All request bodies and query parameters are strictly validated using Zod schemas with `.strict()` rejection of unrecognized keys:

| Field / Parameter | Location | Validation Rule & Boundary | Rejection Code |
|---|---|---|---|
| `email` | Body (`POST /api/auth/login`) | `z.string().email().max(100).toLowerCase().trim()` | `400 VALIDATION_ERROR` |
| `password` | Body (`POST /api/auth/login`) | `z.string().min(1).max(128)` | `400 VALIDATION_ERROR` |
| `recipeId` | Body (`POST /api/orders`) | `z.string().uuid()` | `400 VALIDATION_ERROR` |
| `targetQty` | Body (`POST`, `PATCH /api/orders`) | `z.number().int().min(1).max(100000)` | `400 VALIDATION_ERROR` |
| `fabricRollId` | Body (`POST`, `PATCH /api/orders`) | `z.string().trim().min(3).max(40).regex(/^[A-Z0-9-]+$/)` | `400 VALIDATION_ERROR` |
| `actualFabricYds` | Body (`POST`, `PATCH /api/orders`) | `z.number().positive().max(99999.99).refine(2dp)` | `400 VALIDATION_ERROR` |
| `counts` | Body (`PUT /api/verification/orders/:id/counts`) | `z.array(z.object({ componentId: uuid, actualQty: int(0..1000000) })).min(1)` (unique component IDs) | `400 VALIDATION_ERROR` |
| `note` | Body (`POST /api/verification/orders/:id/reject`) | `z.string().trim().min(5).max(500)` | `400 VALIDATION_ERROR` |
| `approve body` | Body (`POST /api/verification/orders/:id/approve`) | `z.object({}).strict()` (No body permitted) | `400 VALIDATION_ERROR` |
| `pageSize` | Query (All paginated list endpoints) | `z.coerce.number().int().positive().max(50)` | `400 VALIDATION_ERROR` |
| `page` | Query (All paginated list endpoints) | `z.coerce.number().int().positive()` | `400 VALIDATION_ERROR` |
| `from` / `to` | Query (`orders`, `verification/logs`) | `z.string().refine(isValidDateString)` | `400 VALIDATION_ERROR` |
| `q` | Query (Search filters) | `z.string().trim().max(64)` | `400 VALIDATION_ERROR` |

---

### 7. Database Integrity & Storage Layer Hardening

#### 7.1 Immutable Audit Trail Trigger (`trg_logs_immutable`)
```sql
CREATE OR REPLACE FUNCTION fn_prevent_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'verification_logs is an append-only audit trail and cannot be updated or deleted.'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_logs_immutable
BEFORE UPDATE OR DELETE ON verification_logs
FOR EACH ROW EXECUTE FUNCTION fn_prevent_log_mutation();
```

#### 7.2 Gatekeeper Approval Trigger (`trg_approval_gate`)
```sql
CREATE OR REPLACE FUNCTION fn_enforce_approval_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_uncounted_count INT;
  v_shortage_count INT;
BEGIN
  IF NEW.status = 'VERIFIED' AND (OLD.status IS DISTINCT FROM 'VERIFIED') THEN
    SELECT COUNT(*) INTO v_uncounted_count
    FROM order_items
    WHERE order_id = NEW.id AND actual_qty IS NULL;

    IF v_uncounted_count > 0 THEN
      RAISE EXCEPTION 'GATE_UNCOUNTED: Order % has % uncounted components', NEW.id, v_uncounted_count
        USING ERRCODE = '23514';
    END IF;

    SELECT COUNT(*) INTO v_shortage_count
    FROM order_items
    WHERE order_id = NEW.id AND actual_qty < expected_qty;

    IF v_shortage_count > 0 THEN
      RAISE EXCEPTION 'GATE_SHORTAGE: Order % has % shortage components', NEW.id, v_shortage_count
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_approval_gate
BEFORE UPDATE OF status ON cutting_orders
FOR EACH ROW EXECUTE FUNCTION fn_enforce_approval_gate();
```

#### 7.3 Supabase Row-Level Security (RLS)
Direct PostgREST access via the public Supabase anonymous key is completely restricted by enabling RLS with deny-all default policies across all database tables.

---

### 8. Vulnerability Audit & Remediation Log

| Finding ID | Severity | Description | Remediated Implementation | Status |
|---|---|---|---|---|
| **C-01** | **CRITICAL** | JWT Token Role Trust (Privilege Escalation) | Removed token-trusted role claims; implemented D-10 database role verification with 10s TTL in-memory cache (`userSessionCache`). | **RESOLVED** |
| **H-01** | **HIGH** | Low-Entropy JWT Secret | Upgraded to 256-bit (64-character hex) cryptographically random secret matching NIST HMAC-SHA256 standards. | **RESOLVED** |
| **H-02** | **HIGH** | Missing HTTP Defensive Headers | Implemented CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and `poweredByHeader: false` in `next.config.ts`. | **RESOLVED** |
| **H-03** | **HIGH** | Uncaught Recipe Mutation Errors & Missing Auth | Wrapped recipe endpoints with `withAuth`; mutation attempts cleanly return `403 FORBIDDEN` JSON. | **RESOLVED** |
| **M-01** | **MEDIUM** | Rate Limiter Bypass via `X-Forwarded-For` Spoofing | Implemented 3-tier rate limiting (IP+Email 6/min, Account-Level Email 15/min across all IPs, Global IP 30/min). | **RESOLVED** |
| **M-02** | **MEDIUM** | Unbounded Password Length & Missing Body Size Limit | Added 128-char limit to `password` and 100-char limit to `email` in Zod schema before bcrypt; configured 100kb body limit in `next.config.ts`. | **RESOLVED** |
| **M-03** | **MEDIUM** | Logout Missing Origin Check & Cache Invalidation | Added `assertSameOrigin(req)` and server-side `userSessionCache` invalidation to `/api/auth/logout`. | **RESOLVED** |
| **M-04** | **MEDIUM** | `pageSize` Cap Inconsistency (100 vs 50) | Standardized all pagination schemas and queries to maximum `pageSize: 50`. | **RESOLVED** |
| **M-05** | **MEDIUM** | `from` / `to` Date Filter Fails on Unparseable Strings | Added parseable ISO date validation (`refine(Date.parse)`) on all date filter query schemas. | **RESOLVED** |
| **L-02** | **LOW** | Bcrypt Salt Rounds Discrepancy (10 vs 12) | Standardized runtime password hashing to 12 rounds (`SALT_ROUNDS = 12`) and generated matching 12-round `DUMMY_HASH`. | **RESOLVED** |

---

### 9. Automated Security Regression Testing

The security architecture is verified by **71 automated unit and integration tests across 7 test suites**:

```bash
# Execute full Vitest automated test suite
npm test
```

#### Test Suite Breakdown:
1. **`tests/integration/auth.test.ts` (10 tests):** Authentication, session cookies, credential validation, timing attack dummy checks, multi-tier rate limiting, and origin guard.
2. **`tests/integration/verification.test.ts` (10 tests):** Gatekeeper hard stops (T1-T4), traffic light calculations, shortage rejections, uncounted blocks, and concurrency protection.
3. **`tests/integration/orders.test.ts` (8 tests):** Supervisor CRUD boundaries, BOM component derivations, state machine transitions, and immutability after submission.
4. **`tests/integration/sewing.test.ts` (7 tests):** Sewing queue strict isolation (T5), unverified order 404 filtering, and assembly initiation.
5. **`tests/unit/order-domain.test.ts` (15 tests):** Variance calculations, wastage thresholds, and state transitions.
6. **`tests/unit/traffic-light.test.ts` (10 tests):** Strict traffic light evaluation logic (`MATCH`, `EXCESS`, `SHORTAGE`).
7. **`tests/unit/format.test.ts` (11 tests):** Formatting utilities and percentage display calculations.

On Windows environments, the end-to-end HTTP regression script can be executed:
```powershell
.\scripts\security-regression.ps1 -BaseUrl "http://localhost:3000"
```
