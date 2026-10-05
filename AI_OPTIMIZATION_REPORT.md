# ApparelFlow ERP — AI Usage, Prompting & Engineering Optimization Report

## Assessment Context
- **Candidate:** Software Engineering Intern (Full-Stack / React / Next.js)
- **Company:** Webtezza (Pvt) Ltd
- **Project:** ApparelFlow Cutting Operations & Gatekeeper Verification Terminal
- **Core Directive:** "A cutting batch can never enter the sewing queue without explicit verification where every component is counted and none has a shortage (actual < expected) — enforced strictly server-side."
- **Governing Standard:** Honesty rule per Section 13.2 of the Implementation Plan — document only real-world engineering interventions, verified defects, and architectural refactoring performed during development.

---

## 1. Tools & Prompting

### 1.1 Tool Matrix & Task Allocation
Throughout the development lifecycle, **Google Antigravity IDE** was leveraged as the primary AI-assisted engineering environment, utilizing its multi-model orchestration suite (**Claude Sonnet**, **Claude Opus**, **Gemini 3.8 Flash**, and **Gemini 3.7 Flash**) for architectural planning, boilerplate scaffolding, domain derivations, and test automation.

| AI Model / Environment | Assigned Engineering Tasks | Prompting Strategy & Constraints | Retention vs. Rewrite Ratio |
|---|---|---|---|
| **Claude Sonnet** *(via Antigravity)* | **Comprehensive Implementation Plan**, system architecture, core domain calculators (`multiplier.ts`, `wastage.ts`), strict Zod schemas, and design specifications (`DESIGN.md`). | Context-rich, spec-anchored zero-shot: *"Implement the garment multiplier engine for cutting orders per Section 6.5. Return typed breakdown, reject negative or float quantities."* | **85% Retained** / 15% Rewritten (type alignments, Zod 4 syntax adjustments) |
| **Claude Opus** *(via Antigravity)* | Complex architectural reasoning, PostgreSQL immutable triggers (`trg_approval_gate`, `trg_logs_immutable`), 3-tier rate limiting, and STRIDE threat modeling (`SECURITY.md`). | Architecture-driven few-shot: *"Draft PostgreSQL trigger trg_approval_gate ensuring no APPROVED row can be inserted if actual_qty < expected_qty or uncounted. Enforce atomic conditional updates."* | **80% Retained** / 20% Rewritten (error constructor alignment, session actor extraction) |
| **Gemini 3.8 Flash / 3.7 Flash** *(via Antigravity)* | Fast boilerplate scaffolding, design system token translation, high-contrast UI layouts, responsive table components, SVG glyphs, and test suites. | High-fidelity design-system constrained: *"Generate light-theme-only tokens for globals.css following DESIGN.md base palette: ink #19242F, paper #FFFFFF, vat #25476B, chalk #E9ECEF. Never include dark mode or generic slate."* | **70% Retained** / 30% Rewritten (eradication of dark-mode variables, input contrast enforcement, Edge middleware decoupling) |

### 1.2 Prompting Strategies That Succeeded vs. Failed
- **What Succeeded:** 
  1. **Strict Negative Constraints:** Explicitly forbidding certain patterns in the initial prompt (e.g., *"Do NOT use dark mode"*, *"Do NOT trust the client's status in the request body"*, *"Do NOT compute canApprove solely on the frontend"*).
  2. **Domain-Specific Worked Examples:** Supplying the exact test numbers from the specification (e.g., 50 Casual Blouse target qty $\rightarrow$ 100 Sleeve Cuffs, 94.5 yards used on 90 yards expected $\rightarrow$ 5.00% wastage) prevented mathematical hallucination.
- **What Failed:**
  1. **Generic Component Scaffolding:** Asking for "a standard shadcn verification table" resulted in generic SaaS cards, low-contrast placeholder text, dark-mode variable leaks, and missing keyboard navigation.
  2. **Blind Reliance on Third-Party Packages:** Asking AI to "set up rate limiting and database connection" resulted in suggestions for external Redis dependencies or incompatible experimental database driver adapters.

---

## 2. Flawed / Broken AI Code (Real Audited Instances)

During iterative development, continuous auditing uncovered multiple critical defects in AI-generated code. Below are five concrete, documented instances:

### Case 1: Prisma 7 Datasource URL Deprecation & Driver Adapter Overhead
- **AI-Generated Artifact:** Initial `prisma/schema.prisma` generated via scaffolding prompts.
- **Flawed Code:**
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- **Error / Detection:** 
  When running `npx prisma validate`, the CLI threw:
  `error: The datasource property 'url' is no longer supported in schema files. Move connection URLs for Migrate to prisma.config.ts and pass either adapter or accelerateUrl...`
- **Root Cause:** 
  Prisma 7.x radically deprecated connection string declaration within `schema.prisma`, enforcing new driver adapters (`@prisma/adapter-pg`). For serverless Next.js edge and node environments, this introduces unnecessary runtime overhead and connection pool instability.
- **Human Engineering Fix:**
  Pinned Prisma CLI and `@prisma/client` to stable, production-standard `^6.19.3`. Configured dual-mode pooled (`pgbouncer=true` on port 6543) and direct session migration (`port 5432`) connections, ensuring zero adapter latency and instant connection reuse across serverless lambdas.
- **Commit:** `feat(db): initial relational schema`

---

### Case 2: Inverted Dark-Mode Defaults & Zero-Tolerance Input Contrast Failure
- **AI-Generated Artifact:** Initial `src/app/globals.css` and UI inputs generated from template scaffolds.
- **Flawed Code:**
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
- **Error / Detection:**
  On machines or browser sessions with dark mode enabled in the OS, input fields rendered dark backgrounds with white text. In Radix `Select` portals and dropdowns, the popover rendered with transparent or inverted tokens, resulting in white-on-white text that completely failed WCAG AA compliance (4.5:1 ratio).
- **Root Cause:**
  Default AI templates inject `@media (prefers-color-scheme: dark)` automatically. Combined with `bg-transparent` inputs and inherited foreground colors, this directly violated the project's zero-tolerance contrast contract (Section 9.3).
- **Human Engineering Fix:**
  1. Purged the `@media (prefers-color-scheme: dark)` block entirely.
  2. Hardcoded `html { color-scheme: light !important; }` in `globals.css`.
  3. Locked high-contrast tokens: Paper `#FFFFFF`, Slate-900 `#0F172A` (ink), Slate-400 `#68757F` (control-edge), and Indigo Vat `#25476B`.
  4. Explicitly styled Radix portal primitives (`SelectContent`, `DropdownMenuContent`) with solid white backgrounds and high-contrast slate text.
  5. Added `-webkit-autofill` rules to prevent browser autofill styling from inverting colors.
- **Commit:** `feat(ui): high-contrast light-only tokens`

---

### Case 3: Zod 4 Parameter Signature Drift on Primitive Number Validators
- **AI-Generated Artifact:** `src/validators/order.schema.ts`.
- **Flawed Code:**
  ```typescript
  export const createOrderSchema = z.object({
    targetQty: z.number({ invalid_type_error: "Quantity must be an integer" }).int().positive(),
    actualFabricYds: z.number({ invalid_type_error: "Fabric used must be a number" }).positive(),
  });
  ```
- **Error / Detection:**
  TypeScript compilation failed during `npm run build`:
  `error TS2353: Object literal may only specify known properties, and 'invalid_type_error' does not exist in type '$ZodNumberParams'.`
- **Root Cause:**
  AI models frequently output legacy Zod 3 options (`invalid_type_error`, `required_error`). In modern Zod 4 syntax, primitive builder options have been unified under `{ message: "..." }`.
- **Human Engineering Fix:**
  Refactored all schema definitions to use unified message signatures:
  ```typescript
  export const createOrderSchema = z.object({
    targetQty: z.number({ message: "Enter target quantity" })
      .int({ message: "Quantity must be a whole number" })
      .min(1, { message: "Quantity must be at least 1" })
      .max(100000, { message: "Quantity exceeds factory maximum" }),
    ...
  }).strict();
  ```
- **Commit:** `feat(validation): strict zod schemas for orders`

---

### Case 4: AppError Constructor Argument Inversion (RangeError on HTTP Status)
- **AI-Generated Artifact:** Verification service hard stop and error envelope handling.
- **Flawed Code:**
  ```typescript
  throw new AppError("Approval blocked: shortage detected", 422, "GATE_SHORTAGE");
  ```
- **Error / Detection:**
  In automated integration test T2, the server crashed with an unhandled exception:
  `RangeError: init["status"] must be in the range of 200 to 599, inclusive` inside `NextResponse.json`.
- **Root Cause:**
  The AI assumed a traditional Express/Node `(message, statusCode, code)` constructor signature. However, the project's base `AppError` was defined with:
  `constructor(public readonly statusCode: number, public readonly code: string, message: string, public readonly details?: unknown)`
  Passing `"Approval blocked..."` as the first argument assigned a string to `statusCode` (resulting in `NaN` or unparseable status in Next.js).
- **Human Engineering Fix:**
  1. Utilized the pre-existing specialized `GateError` class:
     `constructor(code: "GATE_SHORTAGE" | "GATE_UNCOUNTED", message: string, details?: unknown)`
     which internally hardcodes `statusCode = 422`.
  2. Implemented `BadRequestError` (400) for input validation.
  3. Hardened `toErrorResponse` to validate that `statusCode` is an integer between 400 and 599, falling back to 500 if an invalid status is encountered.
- **Commit:** `feat(verification): approve reject services`

---

### Case 5: Session Property Mismatch (`actor.userId` vs `actor.id`) Breaking Relational Persistence
- **AI-Generated Artifact:** Verification approval decision logging (`verification.service.ts`).
- **Flawed Code:**
  ```typescript
  await tx.verificationLog.create({
    data: {
      orderId,
      verifierId: actor.userId, // <--- Bug
      decision: Decision.APPROVED,
      wastagePct,
      varianceSnapshot,
    },
  });
  ```
- **Error / Detection:**
  Prisma Client threw `Argument 'order' is missing` or `Foreign key constraint violation on verifierId`.
- **Root Cause:**
  The AI hallucinated `actor.userId` based on generic auth tokens, whereas the project's authenticated session interface defines the identity property as `actor.id`. Because `actor.userId` evaluated to `undefined`, Prisma treated `verifierId` as missing and attempted to parse relations incorrectly.
- **Human Engineering Fix:**
  Audited all service handlers (`orders.service.ts`, `verification.service.ts`, `sewing.service.ts`) to ensure `actor.id` is strictly referenced. This guarantees that verifier and supervisor attributions are directly tied to the cryptographic session without client tampering.
- **Commit:** `feat(verification): approve reject services`

---

## 3. Human Refactoring & Architectural Hardening

Beyond fixing syntax and type errors, human engineering was required to transform brittle AI prototypes into a resilient manufacturing gate.

### Refactor 1: Sewing Queue SQL Isolation (Preventing Information Disclosure)
- **AI Approach:**
  The AI generated a generic query builder that accepted query parameters directly:
  ```typescript
  // Flawed AI Implementation
  export async function listSewingQueue(query: any) {
    const status = query.status || 'VERIFIED';
    return prisma.cuttingOrder.findMany({
      where: { status },
      include: { items: true, recipe: true }
    });
  }
  ```
- **Vulnerability:**
  An adversary calling `GET /api/sewing/queue?status=PENDING_VERIFICATION` or `?status=CUTTING_IN_PROGRESS` could leak work-in-progress cutting batches directly to the sewing line, completely violating FR-12 and STRIDE threat I1.
- **Human Hardening:**
  Completely decoupled the query from client parameters. Hardcoded `status: 'VERIFIED'` as an immutable literal and used an explicit allow-list for returned fields:
  ```typescript
  // Hardened Human Architecture
  export async function listSewingQueue(query: SewingQueueQuery): Promise<SewingQueueResult> {
    const where: Prisma.CuttingOrderWhereInput = {
      status: "VERIFIED", // Immutable literal: NEVER accepts client input
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
    ...
  }
  ```

---

### Refactor 2: Defensive Input Guarding (`IntegerInput` Component)
- **AI Approach:**
  AI generated standard HTML `<input type="number">` elements for physical piece counts and target batch quantities.
- **Flawed Behavior:**
  Native `type="number"` inputs allow typing exponential notation (`e`, `E`), decimal points (`.`), minus signs (`-`), and mouse scroll-wheel mutations. In manufacturing environments with touchscreens and barcode/keypad input, this results in `NaN`, fractional pieces, and accidental status corruption.
- **Human Hardening:**
  Engineered a custom `IntegerInput` component:
  1. Uses `type="text"`, `inputMode="numeric"`, and `pattern="[0-9]*"`.
  2. Intercepts `onKeyDown` to discard keys `['e', 'E', '+', '-', '.', ',']`.
  3. Intercepts `onPaste` to sanitize clipboard content, stripping non-numeric characters before setting value.
  4. Pairs with Zod `.strict()` number validators that reject non-integer floats and strings at the API layer.

---

---

### Refactor 3: Dataset-Wide Filter Count Aggregation vs. Paginated Slice Defect
- **AI Approach:**
  AI generated tab count badges using frontend array filtering on the returned `logs` array:
  `logs.filter(l => l.decision === 'APPROVED').length`.
- **Flawed Behavior:**
  Because the query was paginated (`pageSize: 10`), the badges showed `Approved (6)` and `Rejected (4)` even though total recorded decisions in the database was `55` ($6 + 4 = 10 \neq 55$).
- **Human Hardening:**
  1. Updated `listVerificationHistory` in `src/services/verification.service.ts` to use `prisma.verificationLog.groupBy({ by: ['decision'], where: baseWhere })` to compute dataset-wide totals for `ALL`, `APPROVED`, and `REJECTED`.
  2. Updated `listVerificationQueue` to run `prisma.cuttingOrder.aggregate({ where, _sum: { targetQty: true } })` for true total garments in queue.
  3. Bound frontend `FilterChips` badges and KPI cards directly to `meta.counts` and `meta.totalGarments`.

---

### Refactor 4: Cached DB Role Verification & Pipelined Batch Transactions
- **AI Approach:**
  Standard AI templates performed an uncached `prisma.user.findUnique` in `withAuth` on every request, followed by interactive `prisma.$transaction(async (tx) => { ... })` blocks and post-mutation re-fetches. Over remote cloud connections, this accumulated 5–8 sequential round-trips ($2.5\text{s} - 6\text{s}$ latency).
- **Human Hardening:**
  1. Removed the per-request `findUnique` for speed, then reintroduced DB role verification behind a 10s in-memory cache after finding that token-trusted roles allowed stale privileges (C-01). Net result: identity is verified from the signed JWT, role is re-read from the DB at most every 10s per instance, skipping redundant DB queries on hot paths while ensuring role changes take effect within about 10 seconds.
  2. Replaced interactive transactions with Prisma pipelined batch transactions (`prisma.$transaction([ ... ])`) in `approveVerificationOrder` and `rejectVerificationOrder`.
  3. Returned formatted mutation results directly from updated state without multi-table re-fetch queries (`submitOrder` dropped from 4,505ms to 1,009ms).
  4. Removed aggressive background polling timers (`refetchInterval: 15_000`) and increased TanStack Query `staleTime` to 30 seconds for instant cached view transitions.

---

## 4. Defensive Architecture: Multi-Layer Gatekeeper

ApparelFlow enforces a 5-tier defense-in-depth model where no single layer can compromise factory integrity:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Client UI Guard                                                │
│ • "Approve Batch" button disabled via server-confirmed canApprove      │
│ • Gate strip visual alarm (Red = Closed, Green = Open)                 │
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
Every cutting order strictly follows a deterministic state transition machine:

| From State | Allowed Action | Target State | Authorized Role | Guard Conditions |
|---|---|---|---|---|
| `CUTTING_IN_PROGRESS` | `submit` | `PENDING_VERIFICATION` | `cutting_supervisor` | Target qty $\ge 1$, roll ID valid, actual fabric yards entered |
| `PENDING_VERIFICATION`| `approve`| `VERIFIED` | `cutting_verifier` | **All** components counted, zero shortages (`actual >= expected`), immutable audit log created |
| `PENDING_VERIFICATION`| `reject` | `REJECTED` | `cutting_verifier` | Mandatory reason note (5–500 chars), audit log created |
| `REJECTED` | `recut` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Resets physical counts to null; preserves previous rejection audit logs |
| `VERIFIED` | `start` (assembly)| `VERIFIED` | `sewing_supervisor` | Sets `sewingStartedAt` & `sewingStartedBy`; order status remains `VERIFIED` (D-02) |

Any transition outside this matrix triggers an immediate `409 INVALID_STATE_TRANSITION` response.

---

## 5. Summary of Automated Verification

The entire system was verified through end-to-end automated testing against a live Supabase PostgreSQL instance:

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
      Tests  65 passed (65)
```

**Conclusion:** 
AI acceleration enabled rapid scaffolding of relational structures and test matrices, but rigorous human oversight was essential to enforce domain laws, resolve breaking dependency shifts, lock down contrast tokens, and engineer defensive server-side gates.
