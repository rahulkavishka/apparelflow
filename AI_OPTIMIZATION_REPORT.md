# ApparelFlow ERP — AI Usage, Prompting & Engineering Optimization Report

## Assessment Context
- **Candidate:** Software Engineering Intern (Full-Stack / React / Next.js)
- **Company:** Webtezza (Pvt) Ltd
- **Project:** ApparelFlow Cutting Operations & Gatekeeper Verification Terminal
- **Core Directive:** "A cutting batch can never enter the sewing queue without explicit verification where every component is counted and none has a shortage (actual < expected) — enforced strictly server-side."
- **Purpose of this Report:** To transparently document how AI tools were used during development, what worked, what failed, the real bugs caught in AI-generated code, and the manual engineering refactoring required to make the system secure and production-ready.

---

## 1. Tools & Prompting Workflow

### 1.1 Tool Allocation & Usage
Throughout this project, I used **Google Antigravity IDE** as my development environment, pairing with different models depending on the complexity of each task:

| Model / Tool | Primary Tasks Assigned | Prompting Approach & Constraints | What Kept vs. What Changed |
|---|---|---|---|
| **Claude Sonnet 5.5 / 3.5** *(via Antigravity)* | Drafting the initial implementation plan, core domain calculators (`multiplier.ts`, `wastage.ts`), Zod validation schemas, and UI design guidelines (`DESIGN.md`). | Provided the project specification and explicit formulas upfront: *"Implement the garment multiplier engine for cutting orders per Section 6.5. Return a typed breakdown and reject negative or decimal quantities."* | **~85% Kept** — Needed minor manual edits for Zod 4 syntax and TypeScript interface alignments. |
| **Claude Opus 5.5** *(via Antigravity)* | Database triggers (`trg_approval_gate`, `trg_logs_immutable`), 3-tier login rate limiting, and STRIDE security modeling (`SECURITY.md`). | Used architecture-focused prompts with security requirements: *"Write a PostgreSQL trigger trg_approval_gate ensuring no APPROVED log row can be inserted if actual_qty < expected_qty or uncounted."* | **~80% Kept** — Rewrote error handling and corrected session actor property mappings. |
| **Gemini 3.8 Flash & 3.7 Flash** *(via Antigravity)* | Rapid boilerplate scaffolding, converting design tokens to Tailwind CSS, responsive table components, SVG icons, and test case templates. | Provided exact color palettes and negative constraints: *"Generate light-theme CSS tokens following the base palette: ink #19242F, paper #FFFFFF, vat #25476B, chalk #E9ECEF. Never include dark mode or generic slate."* | **~70% Kept** — Had to remove unwanted dark mode styles, fix input contrast, and decouple middleware logic. |

### 1.2 What Worked vs. What Failed in Prompting

#### What Worked Well:
1. **Giving exact test numbers from the spec:** Feeding the models concrete examples (e.g. 50 Casual Blouse $\rightarrow$ 100 Sleeve Cuffs; 94.5 yards used on 90 yards expected $\rightarrow$ 5.00% wastage) prevented mathematical errors and edge-case misunderstandings.
2. **Strict negative constraints:** Explicitly stating what *not* to do (e.g. *"Do NOT use dark mode"*, *"Do NOT trust status sent from the client"*, *"Do NOT compute canApprove solely on the frontend"*) eliminated common bad defaults before writing code.
3. **Layered generation:** Asking for schemas first, domain calculators second, API handlers third, and UI components last resulted in much cleaner, type-safe integration than asking for entire features at once.

#### What Failed or Needed Intervention:
1. **Generic UI component requests:** Asking for "a verification table" or "standard dialog" resulted in low-contrast grey placeholders, missing keyboard navigation, and automatically injected dark mode variables that broke readability.
2. **Suggesting unnecessary infrastructure:** Prompts asking for "rate limiting and DB pooling" frequently generated advice to install Redis or experimental database adapters, which would have added latency and deployment complexity where lightweight in-memory limits and direct PostgreSQL pooling worked better.
3. **API hallucination across library versions:** The models routinely mixed up Zod 3 and Zod 4 syntax, Prisma 6 and Prisma 7 configuration conventions, and Express-style error arguments with Next.js error classes.

---

## 2. Real Bugs Caught in AI-Generated Code

During development and code review, I caught five concrete, critical bugs in the generated code:

### Case 1: Prisma 7 Datasource URL Deprecation & Adapter Overhead
- **Generated Code:**
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- **The Issue:**
  Running `npx prisma validate` threw:
  `error: The datasource property 'url' is no longer supported in schema files. Move connection URLs for Migrate to prisma.config.ts and pass either adapter or accelerateUrl...`
- **Root Cause:**
  Prisma 7 deprecated connection strings directly in `schema.prisma` in favor of new driver adapters (`@prisma/adapter-pg`). For serverless Next.js functions, these adapters introduce extra runtime overhead and connection pooling issues.
- **My Fix:**
  Pinned Prisma CLI and `@prisma/client` to the stable, production-tested `^6.19.3`. Configured dual-mode pooled connections (`pgbouncer=true` on port 6543) and direct session migration (`port 5432`) without fragile adapter wrappers.
- **Commit:** `feat(db): initial relational schema`

---

### Case 2: Inverted Dark Mode Defaults & Input Contrast Failures
- **Generated Code:**
  ```css
  :root {
    --background: #ffffff;
    --foreground: #171717;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --background: #0a0a0a;
      --foreground: #ededed;
    }
  }
  input {
    background: transparent;
    color: inherit;
  }
  ```
- **The Issue:**
  On machines with OS-level dark mode turned on, inputs rendered dark grey backgrounds with white text. Inside Radix dropdowns, popovers rendered with transparent backgrounds, leading to white-on-white text that failed WCAG AA contrast (4.5:1 ratio).
- **Root Cause:**
  The scaffolded Tailwind template automatically included `@media (prefers-color-scheme: dark)` and `bg-transparent` inputs without checking the project's light-only design specification.
- **My Fix:**
  1. Removed the `@media (prefers-color-scheme: dark)` block entirely.
  2. Set `html { color-scheme: light !important; }` in `globals.css`.
  3. Defined explicit high-contrast tokens: Paper `#FFFFFF`, Ink `#19242F`, Control edge `#525E68`, and Indigo Vat `#25476B`.
  4. Styled all Radix dropdowns and dialogs with solid white backgrounds and dark text.
  5. Added `-webkit-autofill` rules to prevent browser autofill from inverting background colors.
- **Commit:** `feat(ui): high-contrast light-only tokens`

---

### Case 3: Zod 4 Parameter Type Mismatch on Primitive Number Validators
- **Generated Code:**
  ```typescript
  export const createOrderSchema = z.object({
    targetQty: z.number({ invalid_type_error: "Quantity must be an integer" }).int().positive(),
    actualFabricYds: z.number({ invalid_type_error: "Fabric used must be a number" }).positive(),
  });
  ```
- **The Issue:**
  Running `npm run build` failed with:
  `error TS2353: Object literal may only specify known properties, and 'invalid_type_error' does not exist in type '$ZodNumberParams'.`
- **Root Cause:**
  The model output legacy Zod 3 options (`invalid_type_error`). In modern Zod 4 syntax, options on primitive builders are unified under `{ message: "..." }`.
- **My Fix:**
  Refactored all schema definitions to use modern message signatures:
  ```typescript
  export const createOrderSchema = z.object({
    targetQty: z.number({ message: "Enter target quantity" })
      .int({ message: "Quantity must be a whole number" })
      .min(1, { message: "Quantity must be at least 1" })
      .max(100000, { message: "Quantity exceeds factory maximum" }),
    // ...
  }).strict();
  ```
- **Commit:** `feat(validation): strict zod schemas for orders`

---

### Case 4: AppError Constructor Argument Inversion Causing Runtime Crash
- **Generated Code:**
  ```typescript
  throw new AppError("Approval blocked: shortage detected", 422, "GATE_SHORTAGE");
  ```
- **The Issue:**
  In automated integration test T2, the server threw:
  `RangeError: init["status"] must be in the range of 200 to 599, inclusive` inside `NextResponse.json`.
- **Root Cause:**
  The model assumed an Express-style `(message, statusCode, code)` constructor. However, our base `AppError` was defined with:
  `constructor(public readonly statusCode: number, public readonly code: string, message: string, public readonly details?: unknown)`
  Passing the string `"Approval blocked..."` as the first argument resulted in `NaN` as the HTTP status code.
- **My Fix:**
  1. Used the specialized `GateError` class:
     `constructor(code: "GATE_SHORTAGE" | "GATE_UNCOUNTED", message: string, details?: unknown)`
     which hardcodes `statusCode = 422`.
  2. Implemented `BadRequestError` (400) for input validation issues.
  3. Added a safety check in `toErrorResponse` to ensure `statusCode` is always a valid integer between 400 and 599, defaulting to 500 otherwise.
- **Commit:** `feat(verification): approve reject services`

---

### Case 5: Session Property Mismatch (`actor.userId` vs `actor.id`)
- **Generated Code:**
  ```typescript
  await tx.verificationLog.create({
    data: {
      orderId,
      verifierId: actor.userId, // Bug: undefined
      decision: Decision.APPROVED,
      wastagePct,
      varianceSnapshot,
    },
  });
  ```
- **The Issue:**
  Prisma threw `Argument 'order' is missing` or a foreign key constraint violation on `verifierId`.
- **Root Cause:**
  The model guessed `actor.userId` based on common auth conventions, but our authenticated session interface uses `actor.id`. Because `actor.userId` evaluated to `undefined`, Prisma failed to insert the foreign key.
- **My Fix:**
  Audited all service files (`orders.service.ts`, `verification.service.ts`, `sewing.service.ts`) to ensure `actor.id` is consistently referenced. This guarantees that audit logs correctly attribute the verifier directly from the session.
- **Commit:** `feat(verification): approve reject services`

---

## 3. Manual Engineering & Architectural Improvements

Beyond fixing compile and runtime errors, I had to redesign several core flows where the initial AI code took fragile or insecure shortcuts:

### Refactor 1: Sewing Queue SQL Isolation (Preventing Information Disclosure)
- **The Initial AI Code:**
  ```typescript
  export async function listSewingQueue(query: any) {
    const status = query.status || 'VERIFIED';
    return prisma.cuttingOrder.findMany({
      where: { status },
      include: { items: true, recipe: true }
    });
  }
  ```
- **The Vulnerability:**
  Anyone calling `GET /api/sewing/queue?status=PENDING_VERIFICATION` or `?status=CUTTING_IN_PROGRESS` could read unverified cutting batches on the sewing floor, breaking the core factory rule and security boundary.
- **My Fix:**
  Completely decoupled the database query from client parameters. Hardcoded `status: 'VERIFIED'` as an immutable literal and used explicit select projections:
  ```typescript
  export async function listSewingQueue(query: SewingQueueQuery): Promise<SewingQueueResult> {
    const where: Prisma.CuttingOrderWhereInput = {
      status: "VERIFIED", // Hardcoded literal: client query parameters cannot override this
    };

    if (query.startedFilter === "awaiting") {
      where.sewingStartedAt = null;
    } else if (query.startedFilter === "started") {
      where.sewingStartedAt = { not: null };
    }

    const [orders, total] = await Promise.all([
      prisma.cuttingOrder.findMany({
        where,
        select: {
          id: true,
          orderNo: true,
          status: true,
          targetQty: true,
          fabricRollId: true,
          actualFabricYds: true,
          verifiedAt: true,
          sewingStartedAt: true,
          recipe: { select: { recipeCode: true, name: true } },
          logs: {
            where: { decision: Decision.APPROVED },
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              wastagePct: true,
              verifier: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { verifiedAt: "desc" },
      }),
      prisma.cuttingOrder.count({ where }),
    ]);
    // ...
  }
  ```

---

### Refactor 2: Defensive Input Guarding (`IntegerInput` Component)
- **The Initial AI Code:**
  Standard `<input type="number">` elements for physical piece counts and batch quantities.
- **The Problem:**
  Native HTML number inputs allow typing exponential notation (`e`, `E`), decimal points (`.`), minus signs (`-`), and can accidentally increment when using a mouse scroll wheel. In a factory environment with touchscreens and keypads, this leads to `NaN`, accidental decimals, or negative numbers.
- **My Fix:**
  Built a dedicated `IntegerInput` component:
  1. Uses `type="text"`, `inputMode="numeric"`, and `pattern="[0-9]*"`.
  2. Blocks keystrokes for `['e', 'E', '+', '-', '.', ',']` on `onKeyDown`.
  3. Sanitizes clipboard pastes to strip non-numeric characters before setting state.
  4. Paired with strict Zod `.int()` and `.min(1)` validators on the API layer.

---

### Refactor 3: Dataset-Wide Count Aggregation vs. Paginated Slice Bug
- **The Initial AI Code:**
  Computed tab badge counts by filtering the current page's array:
  `logs.filter(l => l.decision === 'APPROVED').length`.
- **The Problem:**
  Because the table uses pagination (`pageSize: 10`), the badges showed `Approved (6)` and `Rejected (4)` even though there were 55 total records in the database ($6 + 4 = 10 \neq 55$).
- **My Fix:**
  1. Updated `listVerificationHistory` in `src/services/verification.service.ts` to run a database-level `prisma.verificationLog.groupBy({ by: ['decision'], where: baseWhere })` to calculate true dataset-wide totals for `ALL`, `APPROVED`, and `REJECTED`.
  2. Updated `listVerificationQueue` to run `prisma.cuttingOrder.aggregate({ where, _sum: { targetQty: true } })` for the exact total garment count in the queue.
  3. Wired the frontend filter chips directly to `meta.counts` and `meta.totalGarments`.

---

### Refactor 4: Auth Caching & Pipelined Batch Transactions
- **The Initial AI Code:**
  Performed an uncached `prisma.user.findUnique` in `withAuth` on every request, followed by interactive `prisma.$transaction(async (tx) => { ... })` blocks and post-mutation re-fetches. Over remote database connections, this resulted in 5–8 round-trips per action (2.5s to 6s latency).
- **My Fix:**
  1. **Two-step Auth with 10s In-Memory Cache:** I initially removed the per-request `findUnique` for speed, but after finding that token-trusted roles could allow stale privileges (finding C-01), I reintroduced DB role verification behind a 10-second in-memory cache. Identity comes from the signed JWT, while the user's role is re-read from the DB at most once every 10 seconds per instance. This skips redundant queries on hot paths while ensuring role changes propagate within 10 seconds.
  2. **Pipelined Batch Transactions:** Replaced interactive transactions with Prisma batch transactions (`prisma.$transaction([ ... ])`) in `approveVerificationOrder` and `rejectVerificationOrder`, cutting multi-step round-trips into a single call.
  3. **Direct Mutation Responses:** Returned formatted responses directly from updated records rather than running multi-table re-fetch queries after every write (`submitOrder` dropped from 4,505ms to 1,009ms).
  4. **Instant Cache Sync:** Tuned TanStack Query cache invalidations so that when mutations occur (creating an order, approving a batch, or saving counts), related queues and sidebar badges update immediately without stale delays.

---

## 4. Multi-Layer Gatekeeper Architecture

ApparelFlow enforces a 5-layer defense to guarantee that no unverified or short batch ever enters sewing:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Client UI Guard                                                │
│ • "Approve Batch" button disabled via server-confirmed canApprove      │
│ • Gate strip visual indicator (Red = Closed, Green = Open)             │
│ • Real-time traffic-light evaluation on every physical count change    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Request
┌───────────────────────────────────▼────────────────────────────────────┐
│ Tier 2: RBAC Route Guards (withAuth & 10s Cached Identity)             │
│ • Validates cryptographic JWT (HS256, 8h expiry)                       │
│ • Identity from signed JWT; role re-read from DB at most every 10s     │
│ • Immediate 403 Forbidden before body parsing or business logic        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Tier 3: Strict Schema Validation (Zod)                                 │
│ • .strict() disallows extra keys (rejects client-sent "status")        │
│ • Rejects negative quantities, non-integer counts, invalid roll IDs    │
│ • Immediate 400 Bad Request with field-level error envelope            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Tier 4: Service State Machine & Atomic Conditional Updates             │
│ • Approve endpoint takes NO body fields                                │
│ • Service re-loads persisted components from database and recalculates │
│ • If actual < expected: throws 422 GATE_SHORTAGE                       │
│ • If actual IS NULL: throws 422 GATE_UNCOUNTED                         │
│ • Atomic updateMany where status = PENDING_VERIFICATION (409 on race)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL Transaction
┌───────────────────────────────────▼────────────────────────────────────┐
│ Tier 5: PostgreSQL Database Triggers & Constraints                     │
│ • trg_approval_gate: Blocks INSERT on verification_logs if any item    │
│   of the order is short or uncounted                                   │
│ • trg_logs_immutable: Prevents UPDATE or DELETE on audit logs          │
│ • trg_items_frozen: Blocks mutations to verification_items of VERIFIED │
│ • Row Level Security (RLS): All tables deny public/anon PostgREST read │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 State Machine Lifecycle
Cutting orders follow a deterministic state machine:

| From State | Allowed Action | Target State | Authorized Role | Guard Conditions Enforced |
|---|---|---|---|---|
| `CUTTING_IN_PROGRESS` | `submit` | `PENDING_VERIFICATION` | `cutting_supervisor` | Target qty $\ge 1$, roll ID valid, actual fabric yards entered |
| `PENDING_VERIFICATION`| `approve`| `VERIFIED` | `cutting_verifier` | **All** components counted, zero shortages (`actual >= expected`), immutable audit log created |
| `PENDING_VERIFICATION`| `reject` | `REJECTED` | `cutting_verifier` | Mandatory reason note (5–500 chars), audit log created |
| `REJECTED` | `recut` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Resets physical counts to null; preserves previous rejection audit logs |
| `VERIFIED` | `start` (assembly)| `VERIFIED` | `sewing_supervisor` | Sets `sewingStartedAt` & `sewingStartedBy`; order status remains `VERIFIED` |

Any transition outside this matrix returns an immediate `409 INVALID_STATE_TRANSITION`.

---

## 5. Automated Verification & Test Results

The implementation was validated using Vitest against a live Supabase PostgreSQL instance:

```
 RUN  v5.0.3 C:/.../apparelflow

 ✓ tests/integration/verification.test.ts (9 tests)
   • T1: Approval succeeds (200) when all components are MATCH or EXCESS
   • T2: Approval blocked (422 GATE_UNCOUNTED) when components are uncounted
   • T2: Approval blocked (422 GATE_SHORTAGE) when at least 1 component has a shortage
   • T3: Rejecting without note or note < 5 chars returns 400 VALIDATION_ERROR
   • T3: Rejecting with valid note transitions to REJECTED and creates immutable log
   • T4: Non-verifier roles receive 403 Forbidden on approval
   • Double-approve on already verified order returns 409 Conflict

 ✓ tests/integration/sewing.test.ts (7 tests)
   • T5: Sewing queue query returns ONLY VERIFIED orders
   • T5: URL parameter tampering cannot widen query to leak non-VERIFIED orders
   • T5: Looking up unverified orders returns 404 Not Found (no info disclosure)
   • GET /api/sewing/orders/:id returns full verified specification for VERIFIED batch
   • POST /api/sewing/orders/:id/start begins assembly and preserves VERIFIED status
   • Starting sewing assembly a second time returns 409 Conflict
   • Non-sewing supervisor roles receive 403 Forbidden on sewing endpoints

 ✓ tests/integration/orders.test.ts (7 tests)
   • Order creation with derived expected counts
   • RBAC 403 on non-supervisor roles
   • PATCH updates target qty and recalculates expected items in CUTTING_IN_PROGRESS
   • Submit transitions order to PENDING_VERIFICATION
   • Conflict 409 when editing submitted order

 ✓ tests/integration/auth.test.ts (6 tests)
   • Health endpoint returns 200 and db: ok
   • Login issues HttpOnly, Secure, SameSite=Lax cookie
   • Wrong password and non-existent user return identical generic 401
   • Session persistence and user profile retrieval

 ✓ tests/unit/order-domain.test.ts (15 tests)
   • Multiplier engine component derivation (REC-BL01 & REC-CT02 worked examples)
   • Fabric expected yards and wastage calculation formulas

 ✓ tests/unit/traffic-light.test.ts (10 tests)
   • GREEN (Match), YELLOW (Excess), RED (Shortage), UNCOUNTED evaluation

 ✓ tests/unit/format.test.ts (11 tests)
   • Formatting helpers, date formatting, and variance labeling

 Test Files  7 passed (7)
      Tests  72 passed (72)
```

## Summary
Pairing with Antigravity AI models accelerated writing boilerplate, test fixtures, and domain scaffolding. However, ensuring genuine security, reliable transactions, correct data types, and accessible UI contrast required active hands-on debugging, dependency pinning, and defensive architectural refactoring.
