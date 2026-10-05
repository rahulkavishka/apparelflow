# ApparelFlow ERP — AI Usage & Engineering Judgment Live Log

This running log captures real-time architectural scrutiny, AI code audits, detected defects, and human engineering refactors throughout development. It directly feeds into the final `AI_OPTIMIZATION_REPORT.md`.

---

## Log Entry 1: Prisma 7 Schema Datasource URL Deprecation & Driver Adapter Overhead
- **AI Tool / Task:** Scaffolding ORM dependencies for PostgreSQL database modeling.
- **Symptom / Error:** 
  `error: The datasource property 'url' is no longer supported in schema files. Move connection URLs for Migrate to prisma.config.ts and pass either adapter ...`
- **Root Cause:**
  Prisma 7.x completely removed the standard `url` and `directUrl` fields from `datasource db` in `schema.prisma`, requiring new driver adapters (`@prisma/adapter-pg`) or `accelerateUrl`. This adds unnecessary runtime latency and connection pool complexity on serverless Next.js deployments.
- **Human Refactoring:**
  Audited the dependency tree and locked Prisma CLI and `@prisma/client` to `^6.19.3` / `^6.4.1`. This provides rock-solid, production-tested pooled connection handling (`pgbouncer=true` on port 6543) and session-mode migrations (`port 5432`) without fragile experimental adapter configurations.
- **Commit / Phase:** Phase 1 (`feat(db): initial relational schema`)

---

## Log Entry 2: Zero-Tolerance UI Input Contrast & Inverted Dark Mode Defaults
- **AI Tool / Task:** Next.js scaffolding with Tailwind CSS.
- **Symptom / Error:** 
  `@media (prefers-color-scheme: dark)` in `globals.css` defaulted `--background: #0a0a0a` and `--foreground: #ededed`. In UAT testing, form input backgrounds clashed with text tokens, leading to white-on-white text rendering or illegible dropdown selections.
- **Root Cause:**
  Default template styles blindly inherit dark-mode variables without explicit component-level text colors, directly triggering the exact defect highlighted in Section 11 of the engineering specification.
- **Human Refactoring:**
  1. Completely eradicated the dark mode block from `globals.css`.
  2. Enforced `html { color-scheme: light !important; }` and hardcoded high-contrast industrial tokens:
     - Background: Pure White (`#ffffff`)
     - Foreground: Slate-900 (`#0f172a`, `222 47% 11%`)
     - Input borders: Slate-400 / Slate-500 ($\ge 3:1$ contrast)
     - Input text: High-contrast Slate-900
  3. Styled Radix `SelectContent` and `DropdownMenuContent` portals explicitly with solid white backgrounds and dark text to avoid portal token loss.
  4. Added `-webkit-autofill` CSS rules to defeat browser autofill background overrides.
- **Commit / Phase:** Phase 1 (`feat(ui): high-contrast light-only tokens`)

---

## Log Entry 3: Vitest Node 22 Types Peer Dependency Conflict
- **AI Tool / Task:** Test suite scaffolding.
- **Symptom / Error:**
  `npm error ERESOLVE could not resolve peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.3`
- **Root Cause:**
  `create-next-app` initialized with `@types/node@^20` while running under Node v22.14.0, which clashed with Vitest 5's peer resolution.
- **Human Refactoring:**
  Aligned `@types/node` to `@types/node@^22.20.5`, resolving peer dependency trees cleanly without resorting to dangerous `--force` or `--legacy-peer-deps` flags.
- **Commit / Phase:** Phase 1 (`chore: test setup`)

---

## Log Entry 4: Zod 4 Alpha/Beta Breaking Parameter Types on Primitive Number Validators
- **AI Tool / Task:** Order schema validation generation.
- **Symptom / Error:**
  `error TS2353: Object literal may only specify known properties, and 'invalid_type_error' does not exist in type '$ZodNumberParams'.`
- **Root Cause:**
  AI models typically generate legacy Zod 3 syntax like `z.number({ invalid_type_error: "..." })`. The project resolution pulled `zod@^4.6.5`, where parameter options on primitive builders were unified to `{ message: "..." }`.
- **Human Refactoring:**
  Refactored all schemas in `src/validators/order.schema.ts` to use `{ message: "..." }` and chained `.int()` / `.min()` rules, maintaining full type safety and eliminating TS compilation failures during production build.
- **Commit / Phase:** Phase 2 (`feat(validation): strict zod schemas for orders`)

---

## Log Entry 5: AppError Constructor Argument Order Inversion & RangeError on HTTP Status
- **AI Tool / Task:** Verification service hard stop and error envelope handling.
- **Symptom / Error:**
  `RangeError: init["status"] must be in the range of 200 to 599, inclusive` inside `NextResponse.json` at `toErrorResponse`.
- **Root Cause:**
  AI-generated code called `new AppError("Approval blocked: ...", 422, "GATE_SHORTAGE")` assuming standard `(message, statusCode, code)` signature, whereas the project's base `AppError` was defined with `constructor(public readonly statusCode: number, public readonly code: string, message: string, public readonly details?: unknown)`. This assigned the string message into `statusCode`, causing `NextResponse.json` to crash.
- **Human Refactoring:**
  1. Utilized the pre-existing specialized `GateError` class `constructor(code: "GATE_SHORTAGE" | "GATE_UNCOUNTED", message: string, details?: unknown)` which strictly locks the status code to `422`.
  2. Added an explicit `BadRequestError` (400) subclass to `src/lib/errors.ts` to cleanly separate validation/malformed errors from generic internal errors.
- **Commit / Phase:** Phase 3 (`feat(verification): approve reject services`)

---

## Log Entry 6: Session Interface Property Mismatch (`actor.userId` vs `actor.id`) Breaking Prisma Relation Lookups
- **AI Tool / Task:** Verification decision persistence (`verification_logs`).
- **Symptom / Error:**
  Prisma Client threw `Argument 'order' is missing` when calling `tx.verificationLog.create({ data: { orderId, verifierId: undefined, ... } })`.
- **Root Cause:**
  AI code referenced `actor.userId` when attaching the verifier identity from the verified session context. However, the session's `Actor` interface was defined as `{ id: string, email: string, fullName: string, role: Role }`. Consequently, `verifierId` evaluated to `undefined`, which led Prisma to believe an unchecked create input was missing its relational `order` connector.
- **Human Refactoring:**
  Audited all service handlers to reference `actor.id` consistently, ensuring verified sessions directly populate the immutable audit log foreign keys without client payload leakage.
- **Commit / Phase:** Phase 3 (`feat(verification): approve reject services`)

