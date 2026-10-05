# ApparelFlow ERP — Cutting Operations & Gatekeeper Terminal
## Security Architecture, Threat Model & Hardening Report

### 1. Security Overview

ApparelFlow enforces a zero-trust security perimeter around the cutting-to-sewing gate. The core asset protected is **Order Status Integrity**: non-verified, short, or defective fabric bundles must never breach the sewing assembly line.

---

### 2. STRIDE Threat Model & Defense Mapping

| Threat Category | ID | Attack Scenario | Countermeasure & Control | Verification Test |
|---|---|---|---|---|
| **Spoofing** | S1 | Forged JWT, `alg: none`, stolen cookie | `jose.jwtVerify` pinned strictly to `HS256`. 32-byte secret. Cookie flags `HttpOnly; Secure; SameSite=Lax; Path=/`. | Expired/forged token $\rightarrow$ `401 Unauthorized` |
| **Spoofing** | S2 | Credential brute-force / password stuffing | bcrypt salt rounds 12. Constant-time dummy comparison for unknown emails to defeat timing attacks. | 6 rapid failures $\rightarrow$ `429 Rate Limited` |
| **Tampering** | T1 | Direct status override (`PATCH /api/orders/:id { status: "VERIFIED" }`) | Zod `.strict()` schemas disallow extra keys. Services never accept `status` from payloads. | Injected status $\rightarrow$ `400 Bad Request`; order unchanged |
| **Tampering** | T2 | Forged "all-green" approval (`POST /api/verification/orders/:id/approve` with body) | Approve endpoint accepts **no body**. Server loads persisted items and independently derives statuses. | Body sent $\rightarrow$ ignored or re-evaluated; shortages return `422` |
| **Tampering** | T3 | Direct update to audit trail via SQL or ORM | Database trigger `trg_logs_immutable` forbids `UPDATE` or `DELETE` on `verification_logs`. | Direct SQL update $\rightarrow$ PostgreSQL exception |
| **Tampering** | T4 | Verifier identity spoofing (`verifierId` in body) | Field not accepted. Verifier attribution is extracted exclusively from cryptographic session `actor.id`. | Body `verifierId` $\rightarrow$ ignored; log records session actor |
| **Tampering** | T5 | Race condition bypass (concurrent approval calls) | Prisma interactive transaction, atomic conditional update (`where: { id, status: 'PENDING_VERIFICATION' }`), and database trigger `trg_approval_gate`. | Parallel approvals $\rightarrow$ exactly one succeeds (200), other fails (409) |
| **Repudiation** | R1 | "I never approved that short batch" | Append-only immutable log with foreign key to user ID, server timestamp, wastage %, and component variance snapshot. | Integration test T1 asserts log persistence and session attribution |
| **Information Disclosure** | I1 | Sewing supervisor views unverified batches | Literal SQL query `where: { status: 'VERIFIED' }`. Route parameters like `?status=PENDING` are discarded. Looking up unverified ID returns `404 Not Found`. | Integration test T5 parameter-fuzzing suite |
| **Information Disclosure** | I2 | Password hash leak in user DTOs | Explicit Prisma `select` projections. `passwordHash` is never selected or serialized in JSON responses. | API response shape unit tests |
| **Information Disclosure** | I3 | PostgREST leakage via Supabase anon key | Supabase Row-Level Security (RLS) enabled on all 6 tables with deny-all policy. | Public anon key returns 0 rows |
| **Denial of Service** | D1 | Oversized payload, huge quantities | Body parser limits (100 kB). Maximum `targetQty` capped at 100,000. `pageSize` capped at 50. Non-negative integers enforced. | Out-of-bounds payloads $\rightarrow$ `400 Bad Request` |
| **Elevation of Privilege** | E1 | Supervisor approves verification batch | `withAuth(['cutting_verifier'])` checks active session role before business logic executes. | Supervisor calling approve $\rightarrow$ `403 Forbidden` (Test T4) |
| **Elevation of Privilege** | E2 | Forged role claim inside JWT token | User role is re-queried from database table `users` on every request; token role claims are not trusted (D-10). | Stale or modified JWT role $\rightarrow$ DB role governs access |
| **Cross-Site Scripting (XSS)** | E5 | Malicious script payload in rejection note | React JSX automatic escaping; no `dangerouslySetInnerHTML`. Notes rendered as text nodes. `Content-Security-Policy` header. | XSS string rendered safely as plain text |
| **SQL Injection** | E6 | Malicious SQL payload in `fabricRollId` | Prisma parameterized queries; zero `$queryRawUnsafe`; strict regex pattern `^[A-Z0-9-]{3,40}$`. | SQL injection string $\rightarrow$ `400 Validation Error` |

---

### 3. Authentication & Session Security

- **Cryptographic Token:** JSON Web Token (JWT) signed using `jose` with `HS256` and minimum 256-bit (32-character) secret `JWT_SECRET`.
- **Claims:**
  - `sub`: User ID (UUID)
  - `iat`: Issued-at timestamp
  - `exp`: Expiration timestamp (strictly 8 hours from issue)
- **Cookie Flags:**
  - `HttpOnly`: Inaccessible to client JavaScript (mitigates token theft via XSS).
  - `Secure`: Transmitted only over HTTPS in production.
  - `SameSite=Lax`: Defeats cross-site request forgery (CSRF) on top-level navigations.
  - `Path=/`: Scoped to entire domain.

---

### 4. Zero-Tolerance Contrast & Usability Contract

Adhering to Section 14 of `DESIGN.md` and NFR-01:
- Light-only theme enforced (`html { color-scheme: light !important; }`).
- Dark-mode variable blocks removed from `globals.css`.
- Working surfaces use pure Paper (`#FFFFFF`) with dark Ink (`#19242F`) and explicit Control Edge borders (`#68757F`), achieving $> 13:1$ contrast against the required 4.5:1 WCAG AA baseline.
- Radix UI portals (`SelectContent`, `DropdownMenuContent`) explicitly styled with solid white backgrounds and high-contrast text.
- Focus outlines use high-visibility 2px indigo (`vat` `#25476B`) rings with 2px offset on all interactive elements.

---

### 5. Known, Documented Limitations

1. **Demo Credentials in Production:**
   To satisfy evaluator inspection requirements, public demo credentials are provided on the login page and seed script. These accounts have least-privilege role boundaries and cannot compromise the database host.
2. **In-Memory Rate Limiting:**
   The rate limiter is in-memory per serverless instance. In high-traffic distributed deployments, upgrading to a centralized Redis/Upstash token bucket is recommended.
3. **Stateless JWT Revocation:**
   Logging out clears the client session cookie, but tokens remain cryptographically valid until the 8-hour `exp` window expires. This is mitigated by re-checking user active status and DB role on every request.

---

### 6. Security Regression Script Execution

A dedicated security regression script tests all direct-API attack vectors against a running server:

```bash
# Set base target (defaults to http://localhost:3000)
export BASE=http://localhost:3000

# Execute regression suite
./scripts/security-regression.sh
```

On Windows PowerShell:
```powershell
.\scripts\security-regression.ps1 -BaseUrl "http://localhost:3000"
```
