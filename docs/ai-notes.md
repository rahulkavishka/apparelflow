# ApparelFlow ERP — Development & AI Refactoring Log

This log documents the real bugs, library mismatches, and architectural issues caught while developing the terminal alongside AI models in Antigravity IDE, along with the actual fixes applied.

---

## Log Entry 1: Prisma 7 Datasource URL Deprecation & Driver Adapter Overhead
- **Task:** Setting up Prisma ORM with PostgreSQL.
- **Symptom / Error:** 
  `error: The datasource property 'url' is no longer supported in schema files. Move connection URLs for Migrate to prisma.config.ts and pass either adapter ...`
- **Root Cause:**
  Prisma 7.x removed standard `url` and `directUrl` declarations inside `datasource db` in `schema.prisma`, requiring new driver adapters (`@prisma/adapter-pg`) or `accelerateUrl`. This adds unnecessary runtime latency and connection pool complexity on serverless Next.js functions.
- **My Fix:**
  Pinned Prisma CLI and `@prisma/client` to `^6.19.3`. This provides stable pooled connection handling (`pgbouncer=true` on port 6543) and direct migration connections (`port 5432`) without experimental driver adapters.
- **Phase:** Phase 1 (`feat(db): initial relational schema`)

---

## Log Entry 2: Inverted Dark Mode Defaults & Form Input Contrast
- **Task:** Initial layout and Tailwind CSS styling.
- **Symptom / Error:** 
  `@media (prefers-color-scheme: dark)` in `globals.css` defaulted `--background: #0a0a0a` and `--foreground: #ededed`. On machines with OS dark mode enabled, input fields rendered white-on-white text or invisible dropdown choices in Radix portals.
- **Root Cause:**
  Default Next.js starter templates inject dark mode media queries and transparent inputs (`bg-transparent`) that clash with text colors.
- **My Fix:**
  1. Removed the dark mode media query entirely.
  2. Forced light mode via `html { color-scheme: light !important; }`.
  3. Defined explicit high-contrast tokens: Paper `#FFFFFF`, Ink `#19242F`, Border/Control edge `#525E68`, and Indigo Vat `#25476B`.
  4. Styled Radix `SelectContent` and `DropdownMenuContent` portals with solid white backgrounds.
  5. Added `-webkit-autofill` rules to prevent browser autofill styling from turning text white-on-white.
- **Phase:** Phase 1 (`feat(ui): high-contrast light-only tokens`)

---

## Log Entry 3: Vitest Node 22 Types Peer Dependency Conflict
- **Task:** Setting up automated test suites with Vitest.
- **Symptom / Error:**
  `npm error ERESOLVE could not resolve peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.3`
- **Root Cause:**
  `create-next-app` installed `@types/node@^20` while running under Node v22, which clashed with Vitest 5's peer resolution.
- **My Fix:**
  Updated `@types/node` to `@types/node@^22.20.5`, resolving the dependency tree cleanly without needing `--force` or `--legacy-peer-deps`.
- **Phase:** Phase 1 (`chore: test setup`)

---

## Log Entry 4: Zod 4 Parameter Type Drift on Number Validators
- **Task:** Validating cutting order request payloads with Zod.
- **Symptom / Error:**
  `error TS2353: Object literal may only specify known properties, and 'invalid_type_error' does not exist in type '$ZodNumberParams'.`
- **Root Cause:**
  The generated code used legacy Zod 3 options (`invalid_type_error`). In modern Zod 4 syntax, primitive builder options use `{ message: "..." }`.
- **My Fix:**
  Refactored all order schemas in `src/validators/order.schema.ts` to use `{ message: "..." }` along with `.int()`, `.min(1)`, and `.strict()`.
- **Phase:** Phase 2 (`feat(validation): strict zod schemas for orders`)

---

## Log Entry 5: AppError Constructor Argument Inversion (RangeError on HTTP Status)
- **Task:** Error handling in the verification service.
- **Symptom / Error:**
  `RangeError: init["status"] must be in the range of 200 to 599, inclusive` inside `NextResponse.json` at `toErrorResponse`.
- **Root Cause:**
  The AI called `new AppError("Approval blocked: ...", 422, "GATE_SHORTAGE")` assuming an Express-style `(message, statusCode, code)` signature. But our `AppError` was defined as `(statusCode, code, message, details)`. Passing a string first turned `statusCode` into `NaN`.
- **My Fix:**
  1. Used the specialized `GateError` class `constructor(code, message, details)` which hardcodes `statusCode = 422`.
  2. Added a `BadRequestError` (400) class to `src/lib/errors.ts` for validation failures.
  3. Added a boundary check in `toErrorResponse` to make sure `statusCode` is an integer between 400 and 599, defaulting to 500 if an invalid status is passed.
- **Phase:** Phase 3 (`feat(verification): approve reject services`)

---

## Log Entry 6: Session Property Mismatch (`actor.userId` vs `actor.id`) Breaking Prisma Relations
- **Task:** Writing the verification decision audit log.
- **Symptom / Error:**
  Prisma Client threw `Argument 'order' is missing` or foreign key constraint error when calling `tx.verificationLog.create({ data: { orderId, verifierId: undefined, ... } })`.
- **Root Cause:**
  The code accessed `actor.userId` to get the logged-in verifier's identity, but our session `Actor` interface defines the field as `actor.id`. This made `verifierId` evaluate to `undefined`.
- **My Fix:**
  Audited all service handlers to reference `actor.id` consistently, ensuring verified sessions directly populate foreign keys without relying on client input.
- **Phase:** Phase 3 (`feat(verification): approve reject services`)

---

## Log Entry 7: Cloud Database Hook Timeout in Integration Tests
- **Task:** Running Vitest integration tests against the live PostgreSQL database.
- **Symptom / Error:**
  `Error: Hook timed out in 10000ms.` in `tests/integration/sewing.test.ts`.
- **Root Cause:**
  Vitest defaults `hookTimeout` to 10 seconds. In remote cloud databases (Supabase connection pooler), creating multiple test orders with associated items and audit logs takes 12–15 seconds over network round-trips.
- **My Fix:**
  Updated `vitest.config.ts` to include `hookTimeout: 30000` and `testTimeout: 30000`, and set explicit 30s timeouts on integration `beforeAll` hooks.
- **Phase:** Phase 4 (`test(sewing): T5 queue isolation, start assembly, and rbac`)

---

## Log Entry 8: Hardcoded Status Filter vs. Dynamic Query Parameter
- **Task:** Querying the sewing floor queue in `sewing.service.ts`.
- **Symptom / Potential Issue:**
  The generated code accepted the status from the query string: `where: { status: params.status || 'VERIFIED' }`. A user could pass `?status=PENDING_VERIFICATION` or `?status=CUTTING_IN_PROGRESS` to view unverified cutting batches.
- **Root Cause:**
  The model treated the queue endpoint like a general search query rather than enforcing the core rule that the sewing queue must only ever display verified orders.
- **My Fix:**
  Hardcoded `where: { status: 'VERIFIED' }` as an immutable literal in `prisma.cuttingOrder.findMany`. The service ignores and rejects any incoming status parameter. Verified with integration test T5.
- **Phase:** Phase 4 (`feat(sewing): isolated queue and start assembly`)

---

## Log Entry 9: Tab Filter Counts Broken by Pagination
- **Task:** Filter tab counts in the Verification History and Queue tables.
- **Symptom / Error:** 
  The Verification History page header showed `Total: 55`, but the filter tabs showed `Approved: 6` and `Rejected: 4` ($6 + 4 = 10 \neq 55$).
- **Root Cause:**
  The UI computed badge counts by filtering the current page's array: `logs.filter(l => l.decision === 'APPROVED').length`. Because pagination returned 10 items per page, the badges only reflected the active 10 rows instead of the whole database.
- **My Fix:**
  1. Updated `listVerificationHistory` to run a database-level `prisma.verificationLog.groupBy({ by: ['decision'], where: baseWhere })` to compute true dataset totals for `ALL`, `APPROVED`, and `REJECTED`.
  2. Updated `listVerificationQueue` to run `prisma.cuttingOrder.aggregate({ where, _sum: { targetQty: true } })` for the total garment count.
  3. Bound frontend badges directly to `meta.counts` and `meta.totalGarments`.
- **Phase:** Phase 5 (`fix(verifier): accurate dataset-wide count aggregation for history and queue`)

---

## Log Entry 10: Multi-Round-Trip Latency & Database Role Caching
- **Task:** Optimizing API response times and database round-trip latency.
- **Symptom / Error:**
  CRUD operations over remote database connections were taking noticeable time due to multiple sequential round-trips per request.
- **Root Cause:**
  1. `withAuth` ran a `prisma.user.findUnique` query on every request to look up user roles.
  2. Mutations like `saveCounts` and `submitCuttingOrder` ran multi-table re-fetch queries after saving.
  3. Interactive transactions required multiple sequential network handshakes (`BEGIN`, `INSERT`, `UPDATE`, `COMMIT`).
- **My Fix:**
  1. **Two-Step Auth with 10s In-Memory Cache (D-10):** I initially removed the per-request `findUnique` for speed, but after finding that token-trusted roles could allow stale privileges (finding C-01), I reintroduced DB role verification behind a 10-second in-memory cache. Identity comes from the signed JWT, while the user's role is re-read from the DB at most once every 10 seconds per instance. This skips redundant queries on hot paths while ensuring role changes propagate within 10 seconds.
  2. **Pipelined Batch Transactions:** Replaced interactive transactions with Prisma batch transactions (`prisma.$transaction([ ... ])`) in `approveVerificationOrder` and `rejectVerificationOrder`, reducing round-trips to one call.
  3. **Direct Return:** Formatted mutation results directly from updated database records rather than querying deep relation trees again (`submitOrder` dropped from 4,505ms to 1,009ms).
  4. **Instant Query Cache Invalidation:** Set TanStack Query `staleTime: 0` and added explicit query invalidations on order creation, approval, rejection, and count saving so tables and sidebar badges update immediately upon action.
- **Phase:** Phase 5 (`feat(db): performance and query cache optimizations`)
