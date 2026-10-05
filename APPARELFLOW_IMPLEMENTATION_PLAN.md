# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

## Comprehensive Implementation Plan (SDLC: Requirements → Cloud Deployment)

| | |
|---|---|
| **Company** | Webtezza (Pvt) Ltd |
| **Position** | Software Engineering Intern (Full-Stack / React / Next.js) |
| **Assessment** | Practical Engineering Challenge — Production Batch Verification & Sewing Queue Gate |
| **Window / Effort** | 4 calendar days · target 28–32 focused hours (this plan budgets **30 h**) |
| **Stack** | Next.js (App Router, TypeScript) · Tailwind CSS · shadcn/ui · Prisma ORM · Supabase (PostgreSQL) · JWT auth · Vitest · Vercel |

---

## Table of Contents

1. [Executive Summary & Success Criteria](#1-executive-summary--success-criteria)
2. [Requirements Analysis & Traceability](#2-requirements-analysis--traceability)
3. [Scope, Out of Scope, Assumptions & Design Decisions](#3-scope-out-of-scope-assumptions--design-decisions)
4. [Technology Stack & Rationale](#4-technology-stack--rationale)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [API Documentation](#7-api-documentation)
8. [Security Analysis & Hardening](#8-security-analysis--hardening)
9. [UI/UX, Contrast & Input-Guard Design](#9-uiux-contrast--input-guard-design)
10. [Testing Strategy](#10-testing-strategy)
11. [Phase-by-Phase Implementation Plan](#11-phase-by-phase-implementation-plan)
12. [Deployment, CI/CD & Operations](#12-deployment-cicd--operations)
13. [Documentation Deliverables (README + AI Report)](#13-documentation-deliverables-readme--ai-report)
14. [Submission Checklist & Evaluator Audit Rehearsal](#14-submission-checklist--evaluator-audit-rehearsal)
15. [Risk Register & Definition of Done](#15-risk-register--definition-of-done)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary & Success Criteria

### 1.1 What we are building

A production-deployed, full-stack implementation of the **Cutting Operations & Gatekeeper Verification Terminal**. It is the single checkpoint that stops incomplete, mismatched or short cut-bundles from reaching the sewing floor.

The product is **not** the whole 23-module ERP. It is one mission-critical vertical slice:

```
Cutting Supervisor ──creates──▶ Cutting Order ──submit──▶ PENDING_VERIFICATION
                                                              │
                                   Cutting Verifier counts every component
                                                              │
                          ┌───────────────────────────────────┴──────────────────────────────┐
                    any RED / uncounted                                        all GREEN or YELLOW
                          │                                                                   │
                  Reject (mandatory note)                                    Approve (server re-validates)
                          │                                                                   │
                 REJECTED → supervisor re-cuts                          VERIFIED  → Sewing Queue
                                                                        (immutable audit trail)
```

### 1.2 The one sentence that governs every design choice

> **A batch can never enter the Sewing Queue unless a Cutting Verifier has counted every component and none is RED — and the *server*, not the UI, enforces it.**

### 1.3 Success criteria (mapped to the 100 % rubric)

| Rubric dimension | Weight | What "full marks" looks like in this plan |
|---|---:|---|
| Domain & Business Logic | 15 % | Both recipes seeded exactly per spec; multiplier engine, fabric-expected and wastage formulas implemented as pure, unit-tested functions |
| Gatekeeper Hard Stop | 20 % | Three layers: UI disabled → API returns 422 → **DB trigger** refuses an APPROVED log if any item is RED/uncounted |
| Role Isolation & RBAC | 15 % | One `requireRole()` guard on every route; permission matrix tested; 403 for wrong role, 401 for no session |
| Database & Architecture | 15 % | Normalised 6-table schema (+ minimal extras), enums, FKs, CHECK constraints, immutable audit table, transactional state transitions |
| UI Contrast & Usability | 15 % | Light-only theme, explicit dark text on light inputs, styled Radix dropdowns, axe-core test, inline errors, responsive |
| Automated Tests & Edge Cases | 10 % | `npm test` runs Vitest (≥ 5 mandatory + extras) against a real Postgres; automated security regression suite |
| AI Candor & Optimization | 10 % | `AI_OPTIMIZATION_REPORT.md` with **real** flawed-AI findings logged during the build (see §13.2) |

---

## 2. Requirements Analysis & Traceability

Every sentence of the assessment document is decomposed into an ID. Nothing in the PDF may be left without an owner.

### 2.1 Functional requirements (FR)

| ID | Requirement | Spec § |
|---|---|---|
| FR-01 | Real authentication with three roles: `cutting_supervisor`, `cutting_verifier`, `sewing_supervisor` | 5 |
| FR-02 | Visible **Role Switcher / Demo Credential Panel** so an evaluator can test each persona | 5 |
| FR-03 | Seed ≥ 2 recipes: **REC-BL01 Casual Blouse** and **REC-CT02 Crop Top**, with exact component multipliers, std fabric and wastage cap | 7.1 |
| FR-04 | Supervisor creates a cutting order: Recipe, Target Batch Qty, Fabric Roll ID, Actual Fabric Used (yards) | 7.2 |
| FR-05 | **Multiplier engine** derives Expected Component Counts (`target_qty × pieces_per_garment`) dynamically | 7.2 |
| FR-06 | Submitting an order moves it to `PENDING_VERIFICATION` | 7.2 / 6 |
| FR-07 | Verifier enters physical count for **every** component of an order | 7.3 |
| FR-08 | Real-time traffic light per component: GREEN (==), YELLOW (>), RED (<) | 7.3 |
| FR-09 | **Hard stop**: any RED/missing/uncounted component ⇒ "Approve Batch" disabled in UI and rejected by API | 7.4 / 9 |
| FR-10 | "Reject Batch" requires a mandatory reason note; order returns to supervisor for re-cutting | 7.4 / 6 |
| FR-11 | On VERIFIED, persist **immutably**: verifier user ID, timestamp, component count variances, fabric wastage % | 6 |
| FR-12 | Sewing Queue shows **only** VERIFIED orders, with piece counts, verifier attribution and audit notes | 7.5 / 5 |
| FR-13 | Sewing Supervisor can click **"Start Sewing Assembly"** | 7.5 |
| FR-14 | Backend computes and stores `Fabric Wastage % = ((Actual − Expected) ÷ Expected) × 100` | 7.5 |
| FR-15 | Relational schema with at least: users, recipes, recipe_components, cutting_orders, verification_items, verification_logs | 8 |
| FR-16 | All orders, counts, transitions and audit logs persist across reloads in a cloud DB | 11 |
| FR-17 | Inputs reject negatives, decimals (on counts), non-numeric strings and empty payloads, with immediate inline errors | 11 |
| FR-18 | Supervisor **cannot** verify batches and **cannot** access the Sewing Queue | 5 |
| FR-19 | Verifier **cannot** create orders, edit recipes, or access the Sewing Queue | 5 |
| FR-20 | Sewing Supervisor is **strictly blocked** from unverified, pending or rejected orders | 5 |

### 2.2 Security requirements (SR)

| ID | Requirement | Spec § |
|---|---|---|
| SR-01 | Server-side RBAC: supervisor POSTing an approval ⇒ **403 Forbidden** | 9 |
| SR-02 | Server-side hard stop: approval with any RED / missing / uncounted component ⇒ **422 Unprocessable Entity** | 9 |
| SR-03 | Sewing queue endpoint enforces `WHERE status = 'VERIFIED'` **at the database level**; URL params cannot widen it | 9 |
| SR-04 | Verifier identity and audit timestamps come from the **server session/JWT**, never from the request body | 9 |
| SR-05 | UI-only controls (disabled buttons, hidden tabs, redirects) are never the security boundary; cURL/Postman bypass must fail cleanly | 9 |
| SR-06 | Audit values are immutable once written | 6 |

### 2.3 Non-functional & delivery requirements (NFR)

| ID | Requirement | Spec § |
|---|---|---|
| NFR-01 | **Zero-tolerance**: high-contrast, legible text in all inputs, focus states and dropdowns | 11 |
| NFR-02 | Responsive layout | 15 |
| NFR-03 | Automated tests runnable via `npm test`; must include the five mandatory tests (T1–T5) | 10 / 14 |
| NFR-04 | Public live URL (Vercel/Netlify/Render/Railway), live and testable | 14 |
| NFR-05 | Public GitHub repo with **atomic commit history** showing iterative development | 14 |
| NFR-06 | `AI_OPTIMIZATION_REPORT.md` in repo root with the four mandatory sections | 12 / 14 |
| NFR-07 | `README.md`: architecture summary, schema documentation, demo credentials for all 3 roles | 14 |
| NFR-08 | Follow the 4-day milestone schedule | 13 |
| NFR-09 | Survive the evaluator's 5-minute audit (contrast, RBAC, shortage hard stop, sewing handoff + refresh, code/AI report) | 16 |

### 2.4 The five mandatory tests (verbatim intent)

| Test | Rule |
|---|---|
| **T1** | An order with all GREEN components can be approved by an authenticated Verifier |
| **T2** | An order containing at least one RED component blocks approval and returns an error |
| **T3** | Rejecting without a reason note is rejected by backend validation |
| **T4** | Non-verifier roles receive 403 when attempting approval |
| **T5** | Unapproved orders never appear in the Sewing Queue database query |

### 2.5 Traceability matrix (requirement → implementation → verification)

| Req | Implemented in | Phase | Verified by |
|---|---|:-:|---|
| FR-01 | `lib/auth/*`, `POST /api/auth/login`, bcrypt + `jose` JWT | 1 | Integration: login ok / bad password / expired token |
| FR-02 | `components/domain/DemoCredentialPanel`, header Role Switcher | 2 | E2E: switch persona via panel |
| FR-03 | `prisma/seed.ts` | 1 | Integration: seed produces exact multipliers |
| FR-04 | `POST /api/orders`, Create Order modal | 2 | Integration + E2E |
| FR-05 | `domain/multiplier.ts` | 2 | Unit: 50 blouses ⇒ 100 cuffs |
| FR-06 | `POST /api/orders/:id/submit` | 2 | Integration: state transition |
| FR-07 | `PUT /api/verification/orders/:id/counts`, Verifier Terminal | 3 | Integration + E2E |
| FR-08 | `domain/traffic-light.ts` (shared by client and server) | 3 | Unit: ==, >, < boundaries |
| FR-09 | UI disabled + service guard + DB trigger | 3 | **T2** + E2E button disabled + cURL |
| FR-10 | `POST …/reject`, Zod `note` rule + DB CHECK | 3 | **T3** |
| FR-11 | `verification_logs` (append-only, trigger) + snapshot JSON | 3 | Integration: UPDATE on log fails |
| FR-12 | `GET /api/sewing/queue`, Sewing UI | 4 | **T5** + E2E |
| FR-13 | `POST /api/sewing/orders/:id/start` | 4 | Integration + E2E |
| FR-14 | `domain/wastage.ts`, stored in log | 3 | Unit: worked examples |
| FR-15 | `prisma/schema.prisma` | 1 | `prisma validate`, migration applied in CI |
| FR-16 | Postgres on Supabase, no client-only state | 1–4 | E2E: reload keeps data |
| FR-17 | Zod schemas (shared), `IntegerInput`, inline errors | 2 | Unit + E2E |
| FR-18/19/20 | `requireRole()` + permission matrix | 1–4 | **T4** + matrix test |
| SR-01…06 | §8 controls | 1–5 | Security regression script + tests |
| NFR-01 | §9.3 tokens + contrast audit | 2, 4 | High-contrast WCAG AA/AAA compliance across all pages |
| NFR-03 | Vitest integration suite | 4 | CI green |
| NFR-04 | Vercel + Supabase | 1, 5 | Post-deploy smoke test |

---

## 3. Scope, Out of Scope, Assumptions & Design Decisions

### 3.1 In scope

- Authentication (email + password → JWT in httpOnly cookie) with three seeded demo personas
- Recipes: seeded, **read-only** (list + detail with components)
- Cutting orders: create, edit while in progress, submit, re-cut after rejection
- Verification terminal: per-component counts, live traffic lights, approve / reject
- Immutable audit trail and fabric wastage analytics
- Sewing Queue (VERIFIED only), order detail with verifier attribution, "Start Sewing Assembly"
- Server-side RBAC, hard stop, query isolation, tamper protection
- Relational schema, migrations, seed, DB-level safeguards
- Automated tests (Vitest integration/unit suites + security regression)
- API documentation (Markdown + OpenAPI), README, security notes, AI report
- Cloud deployment (Vercel + Supabase) and CI pipeline

### 3.2 Out of scope (explicitly)

| Item | Reason |
|---|---|
| The other ~22 ERP modules (inventory, payroll, purchasing, etc.) | Spec §4 scoping boundary |
| Recipe / BOM **management** UI and API (create/edit/delete recipes) | Recipes are seed data; any mutation endpoint returns 403 for all roles |
| User management, registration, password reset, email verification | Three fixed demo users are enough; documented as a limitation |
| OAuth / SSO / MFA | Spec asks for JWT; keep surface small |
| Real-time push (WebSockets/SSE) | "Real-time" in the spec means instant client-side traffic lights, not multi-user push; queues refresh by polling/refetch-on-focus |
| Barcode/RFID scanners, label printing, hardware integration | Physical-plant integration |
| Multi-factory / multi-tenant support | Not required |
| Sewing line scheduling, operator assignment, piece-rate tracking | Only "Start Sewing Assembly" is required |
| Reporting dashboards beyond per-order wastage % | Not required |
| Internationalisation | English only |
| Native mobile apps | Responsive web only |
| File uploads (component images) | `image_url` points to bundled static SVG placeholders |

### 3.3 Assumptions

1. Three demo accounts (one per role) are acceptable and publicly documented in the README; they are demo-only.
2. A single Supabase project hosts production; tests run against a **separate** Postgres (CI service container or a second Supabase project), never production.
3. Evaluators use a modern desktop or mobile browser.
4. Expected fabric = `target_qty × recipe.std_fabric_yards`.
5. Wastage above the recipe's cap is a **warning**, not a blocker (the spec's only hard stop is a RED component).

### 3.4 Design decisions (resolving spec ambiguities)

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Order creation and submission are **two steps**: create ⇒ `CUTTING_IN_PROGRESS`; submit ⇒ `PENDING_VERIFICATION` | Spec §7.2 says "submitting transitions"; matches the state diagram's "Supervisor Prepares Order". The modal offers *Save draft* and *Submit for verification* |
| D-02 | "Start Sewing Assembly" sets `sewing_started_at` / `sewing_started_by` on the order; **status remains `VERIFIED`** | Keeps the literal `WHERE status = 'VERIFIED'` rule in the queue query and keeps VERIFIED permanent. UI shows an "In assembly" badge |
| D-03 | Counts (`target_qty`, `actual_qty`) are **integers only**. Fabric yards accept a positive number with **max 2 decimals** | Real fabric is measured in fractional yards; the "no decimals" rule is applied to piece counts. Documented in README; a single constant switches yards to integer-only if the evaluator disagrees |
| D-04 | Verifier counts are **persisted first**; approve takes **no counts in its body** and the server re-derives every status from stored rows | The client can never claim "all green" |
| D-05 | Item status and approval eligibility are **recomputed on the server**; client-sent status is never read | SR-05 |
| D-06 | Rejection note: trimmed, **5–500 characters** | "Mandatory reason" with minimal friction |
| D-07 | `REJECTED → CUTTING_IN_PROGRESS` via supervisor "Re-cut" action; per-item counts reset; history preserved in `verification_logs` | Spec: "returning the batch to the Supervisor for re-cutting" |
| D-08 | `verification_logs` stores a **JSON snapshot** of per-component expected/actual/variance/status plus fabric figures at decision time | Variances stay immutable even if working rows change on re-cut |
| D-09 | Use **Route Handlers** (`/api/...`) rather than Server Actions | Evaluators test with cURL/Postman and expect 403/422 |
| D-10 | Role is **re-read from the database** on every request; the JWT only proves identity | Stale or forged role claims cannot escalate |
| D-11 | `order_no` format `CUT-000001` generated from a DB sequence | Collision-free, human-readable |
| D-12 | Enable **RLS (deny-all)** on every table | Supabase exposes tables through PostgREST with the anon key; Prisma connects as a privileged role and is unaffected |
| D-13 | Sewing detail for a non-VERIFIED order returns **404**, not 403 | Do not leak existence |
| D-14 | Seed demo orders in various states only when `SEED_DEMO_ORDERS=true` | Lets evaluators see a populated app; default off keeps a clean slate |

> **Action before coding:** confirm D-03 and D-06. Everything else can stand as is.

---

## 4. Technology Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One repo for UI and API; Route Handlers give REST semantics; first-class Vercel deploy |
| Styling | **Tailwind CSS** | Utility classes make explicit contrast tokens easy to audit |
| Components | **shadcn/ui** (Radix primitives) | Accessible dialogs/selects/forms; **must be overridden for contrast** (§9.3) |
| Forms / validation | **react-hook-form + Zod** (`@hookform/resolvers`) | Same Zod schemas validate on client and server |
| Data fetching | **TanStack Query** | Cache, refetch-on-focus, and requests visible in the network tab (evaluators inspect it) |
| ORM | **Prisma** | Typed schema, migrations, interactive transactions |
| Database | **Supabase PostgreSQL** | Managed cloud Postgres; we use only the database (not Supabase Auth) |
| Auth | **`jose` (JWT) + `bcryptjs`** | Edge-safe JWT verify; pure-JS bcrypt avoids native-build problems on Vercel |
| Unit/integration tests | **Vitest** | Fast; calls Route Handlers directly; `npm test` |
| Security Regression | **Node / PowerShell scripts** | Direct HTTP and tamper validation |
| Quality | ESLint, Prettier, `tsc --noEmit`, Husky + lint-staged (optional) | Clean atomic commits |
| Hosting | **Vercel** (app) + **Supabase** (DB) | Public URL, preview deploys, env management |
| CI | **GitHub Actions** | Lint → typecheck → test → build on every push/PR |

**Version policy:** use the latest stable releases at project start and pin them via the lockfile. Prisma note: this plan uses the classic `url` / `directUrl` datasource syntax; if the installed Prisma major version moves connection URLs into `prisma.config.ts` or requires a driver adapter, follow the current Prisma docs for that version. The architecture is unchanged.

---

## 5. System Architecture

### 5.1 Layered architecture

```mermaid
flowchart TB
  subgraph Browser
    UI[Next.js pages / shadcn UI<br/>TanStack Query + react-hook-form]
  end
  subgraph Vercel["Vercel (Next.js server)"]
    MW[middleware.ts<br/>UX redirects ONLY]
    RH[Route Handlers /api/*<br/>withAuth + requireRole + Zod]
    SV[Services<br/>orders · verification · sewing]
    DM[Domain (pure functions)<br/>multiplier · traffic-light · wastage · state-machine]
  end
  subgraph Supabase["Supabase PostgreSQL"]
    DB[(Tables + enums<br/>CHECK constraints<br/>triggers · RLS deny-all)]
  end
  UI -->|fetch + httpOnly cookie| RH
  UI -.-> MW
  RH --> SV --> DM
  SV -->|Prisma, parameterised| DB
```

**Layer rules (enforced in code review):**

| Layer | May do | Must not do |
|---|---|---|
| `app/api/**/route.ts` | Parse request, authenticate, authorise, validate with Zod, call a service, map errors to HTTP | Contain business rules or Prisma queries |
| `services/*` | Business rules, transactions, Prisma calls; **receive the `actor` (user) as an argument** | Read cookies/headers; trust any client-supplied identity |
| `domain/*` | Pure functions, no I/O | Import Prisma/Next |
| `validators/*` | Zod schemas shared by client and server | Contain logic beyond shape/format |
| UI | Present state, give early feedback | Be treated as a security control |

### 5.2 Folder structure

```
apparelflow/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/                 # includes the hand-written hardening migration
│  └─ seed.ts
├─ public/components/             # placeholder SVGs for recipe_components.image_url
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx            # login + Demo Credential Panel
│  │  ├─ (app)/layout.tsx                 # server-side session check + role-aware shell
│  │  ├─ (app)/supervisor/orders/page.tsx
│  │  ├─ (app)/supervisor/orders/[id]/page.tsx
│  │  ├─ (app)/verifier/queue/page.tsx
│  │  ├─ (app)/verifier/orders/[id]/page.tsx   # Verification Terminal
│  │  ├─ (app)/verifier/history/page.tsx
│  │  ├─ (app)/sewing/queue/page.tsx
│  │  ├─ (app)/sewing/orders/[id]/page.tsx
│  │  └─ api/
│  │     ├─ health/route.ts
│  │     ├─ auth/{login,logout,me}/route.ts
│  │     ├─ recipes/route.ts · recipes/[id]/route.ts
│  │     ├─ orders/route.ts · orders/[id]/route.ts
│  │     ├─ orders/[id]/{submit,recut}/route.ts
│  │     ├─ verification/{queue,logs}/route.ts
│  │     ├─ verification/orders/[id]/route.ts
│  │     ├─ verification/orders/[id]/{counts,approve,reject}/route.ts
│  │     └─ sewing/{queue}/route.ts · sewing/orders/[id]/route.ts · sewing/orders/[id]/start/route.ts
│  ├─ components/
│  │  ├─ ui/                      # shadcn (contrast-overridden)
│  │  └─ domain/                  # OrderTable, CreateOrderModal, VerificationRow,
│  │                              # TrafficLight, RejectDialog, AuditPanel, DemoCredentialPanel, IntegerInput
│  ├─ domain/                     # multiplier.ts · traffic-light.ts · wastage.ts · state-machine.ts
│  ├─ services/                   # orders.service.ts · verification.service.ts · sewing.service.ts · auth.service.ts
│  ├─ validators/                 # auth.schema.ts · order.schema.ts · verification.schema.ts
│  ├─ lib/
│  │  ├─ auth/{jwt,password,session,guards}.ts
│  │  ├─ db.ts · env.ts · errors.ts · http.ts · rate-limit.ts
│  └─ hooks/                      # useOrders, useVerificationQueue, useSewingQueue…
├─ tests/
│  ├─ unit/                       # domain + validators
│  ├─ integration/                # route handlers against real Postgres (T1–T5 + extras)
│  └─ helpers/                    # db reset, loginAs(role), request factory
├─ docs/{API.md,openapi.yaml,SECURITY.md,ARCHITECTURE.md}
├─ scripts/{security-regression.sh,smoke.sh}
├─ .github/workflows/ci.yml
├─ .env.example · README.md · AI_OPTIMIZATION_REPORT.md
```

### 5.3 Request lifecycle (every protected endpoint)

```
Request
 └─ 1. Origin check (mutating methods)               → 403 on mismatch (CSRF defence-in-depth)
 └─ 2. Read JWT from httpOnly cookie (req.headers)   → 401 if missing/invalid/expired
 └─ 3. Load user by `sub` from DB; role := DB role   → 401 if user no longer exists
 └─ 4. requireRole([...allowed])                     → 403 if role not allowed
 └─ 5. Zod .strict() parse (params, query, body)     → 400 VALIDATION_ERROR (unknown keys rejected)
 └─ 6. Service(actor, input)                         → business rules inside a transaction
 └─ 7. Map domain error → HTTP (409 / 422 / 404)     → uniform error envelope
 └─ 8. Response { data } — never leaks stack traces
```

> **Testability rule:** `getSession(req: Request)` reads the cookie from `req.headers`, **not** from `next/headers`. That lets Vitest call `POST(new Request(...))` directly without a running server.

### 5.4 State machine

```mermaid
stateDiagram-v2
  [*] --> CUTTING_IN_PROGRESS: Supervisor creates order
  CUTTING_IN_PROGRESS --> PENDING_VERIFICATION: submit (supervisor)
  PENDING_VERIFICATION --> VERIFIED: approve (verifier) — all items counted, none RED
  PENDING_VERIFICATION --> REJECTED: reject (verifier) — note required
  REJECTED --> CUTTING_IN_PROGRESS: re-cut (supervisor)
  VERIFIED --> VERIFIED: start sewing (sewing_started_* set, status unchanged)
```

| From | To | Actor | Guards | Side effects |
|---|---|---|---|---|
| — | CUTTING_IN_PROGRESS | cutting_supervisor | valid recipe, ints/yards valid | create order + one `verification_items` row per component (`expected_qty` = target × pieces) |
| CUTTING_IN_PROGRESS | PENDING_VERIFICATION | cutting_supervisor | actor is creator or any supervisor (assumed team-wide) | `submitted_at` set |
| PENDING_VERIFICATION | VERIFIED | cutting_verifier | **every item counted and `actual ≥ expected`** | insert APPROVED log (verifier from session, wastage %, snapshot); `verified_at` set |
| PENDING_VERIFICATION | REJECTED | cutting_verifier | `note` 5–500 chars | insert REJECTED log with note |
| REJECTED | CUTTING_IN_PROGRESS | cutting_supervisor | — | reset `actual_qty/status`; logs untouched |
| VERIFIED | VERIFIED (+sewing fields) | sewing_supervisor | `sewing_started_at IS NULL` | `sewing_started_at/by` set |

**Implementation rule:** the transition map lives in `domain/state-machine.ts`. Every write uses a conditional update:

```ts
const res = await tx.cuttingOrder.updateMany({
  where: { id, status: 'PENDING_VERIFICATION' },   // expected "from" state
  data:  { status: 'VERIFIED', verifiedAt: now },
});
if (res.count !== 1) throw new ConflictError('INVALID_STATE_TRANSITION');
```

This blocks double-approval, approve-after-reject, and races between two verifiers.

### 5.5 Permission matrix (single source of truth)

| Capability | cutting_supervisor | cutting_verifier | sewing_supervisor |
|---|:-:|:-:|:-:|
| Login / logout / me | ✅ | ✅ | ✅ |
| Read recipes | ✅ | ✅ (read-only) | ❌ 403 |
| Mutate recipes | ❌ 403 | ❌ 403 | ❌ 403 |
| Create / edit / submit / re-cut orders | ✅ | ❌ 403 | ❌ 403 |
| List/read cutting orders (`/api/orders`) | ✅ | ❌ 403 (uses `/api/verification/*`) | ❌ 403 |
| Verification queue / terminal / save counts | ❌ 403 | ✅ | ❌ 403 |
| Approve / reject | ❌ **403** | ✅ | ❌ 403 |
| Sewing queue / detail / start | ❌ 403 | ❌ 403 | ✅ (VERIFIED only) |

The matrix is encoded once (`lib/auth/guards.ts`) and imported by both the route handlers and a table-driven test that iterates every route × role.

---

## 6. Database Design

### 6.1 Entity-relationship diagram

```mermaid
erDiagram
  users ||--o{ cutting_orders : "creates (created_by)"
  users ||--o{ verification_logs : "verifies (verifier_id)"
  users ||--o{ cutting_orders : "starts sewing (sewing_started_by)"
  recipes ||--o{ recipe_components : has
  recipes ||--o{ cutting_orders : "produced by"
  cutting_orders ||--o{ verification_items : has
  recipe_components ||--o{ verification_items : "counted as"
  cutting_orders ||--o{ verification_logs : "decided by"

  users { uuid id PK
          text email UK
          text password_hash
          role role
          text full_name
          timestamptz created_at }
  recipes { uuid id PK
            text recipe_code UK
            text name
            text category
            numeric std_fabric_yards
            numeric wastage_cap }
  recipe_components { uuid id PK
                      uuid recipe_id FK
                      text component_name
                      int pieces_per_garment
                      text image_url }
  cutting_orders { uuid id PK
                   text order_no UK
                   uuid recipe_id FK
                   int target_qty
                   text fabric_roll_id
                   numeric actual_fabric_yds
                   order_status status
                   uuid created_by FK
                   timestamptz created_at
                   timestamptz updated_at
                   timestamptz submitted_at
                   timestamptz verified_at
                   timestamptz sewing_started_at
                   uuid sewing_started_by FK }
  verification_items { uuid id PK
                       uuid order_id FK
                       uuid component_id FK
                       int expected_qty
                       int actual_qty
                       item_status status }
  verification_logs { uuid id PK
                      uuid order_id FK
                      uuid verifier_id FK
                      decision decision
                      text rejection_note
                      numeric wastage_pct
                      jsonb variance_snapshot
                      timestamptz timestamp }
```

### 6.2 Table dictionary

**Enums:** `Role(cutting_supervisor, cutting_verifier, sewing_supervisor)` · `OrderStatus(CUTTING_IN_PROGRESS, PENDING_VERIFICATION, REJECTED, VERIFIED)` · `ItemStatus(GREEN, YELLOW, RED)` · `Decision(APPROVED, REJECTED)`

| Table | Column | Type | Constraints / notes |
|---|---|---|---|
| **users** | id | uuid | PK |
| | email | text | UNIQUE, stored lower-case |
| | password_hash | text | bcrypt (cost 12); never returned by any API |
| | role | Role | NOT NULL |
| | full_name | text | NOT NULL |
| | created_at | timestamptz | default now() |
| **recipes** | id | uuid | PK |
| | recipe_code | text | UNIQUE (`REC-BL01`, `REC-CT02`) |
| | name, category | text | NOT NULL |
| | std_fabric_yards | numeric(6,2) | CHECK > 0 |
| | wastage_cap | numeric(5,2) | CHECK ≥ 0 (percent) |
| **recipe_components** | id | uuid | PK |
| | recipe_id | uuid | FK → recipes, ON DELETE CASCADE |
| | component_name | text | UNIQUE (recipe_id, component_name) |
| | pieces_per_garment | int | CHECK > 0 |
| | image_url | text | nullable; relative path to static SVG |
| **cutting_orders** | id | uuid | PK |
| | order_no | text | UNIQUE, `CUT-000001` from sequence |
| | recipe_id | uuid | FK → recipes (RESTRICT) |
| | target_qty | int | CHECK > 0 (and ≤ 100000 sanity cap) |
| | fabric_roll_id | text | NOT NULL, pattern `^[A-Z0-9-]{3,40}$` enforced in Zod |
| | actual_fabric_yds | numeric(8,2) | CHECK > 0 |
| | status | OrderStatus | default CUTTING_IN_PROGRESS; **only changed by services** |
| | created_by | uuid | FK → users |
| | created_at, updated_at | timestamptz | |
| | submitted_at, verified_at | timestamptz | nullable |
| | sewing_started_at / _by | timestamptz / uuid | nullable; FK → users |
| **verification_items** | id | uuid | PK |
| | order_id | uuid | FK → cutting_orders, ON DELETE CASCADE |
| | component_id | uuid | FK → recipe_components |
| | expected_qty | int | CHECK > 0; set at creation = target × pieces |
| | actual_qty | int | nullable (= **uncounted**); CHECK ≥ 0 |
| | status | ItemStatus | nullable until counted; computed server-side |
| | | | UNIQUE (order_id, component_id) |
| **verification_logs** | id | uuid | PK |
| | order_id | uuid | FK → cutting_orders |
| | verifier_id | uuid | FK → users; **from session** |
| | decision | Decision | NOT NULL |
| | rejection_note | text | CHECK: required (≥ 5 chars trimmed) when REJECTED |
| | wastage_pct | numeric(7,2) | signed; computed server-side |
| | variance_snapshot | jsonb | per-component expected/actual/variance/status + fabric expected/actual + cap |
| | timestamp | timestamptz | default now(); **server clock** |

**Indexes:** `cutting_orders(status, created_at DESC)` · `cutting_orders(created_by)` · `verification_items(order_id)` · `verification_logs(order_id, timestamp DESC)` · `verification_logs(verifier_id)`.

### 6.3 Prisma schema (starting point)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled (pgbouncer) — runtime
  directUrl = env("DIRECT_URL")     // direct/session — migrations
}

enum Role {
  cutting_supervisor
  cutting_verifier
  sewing_supervisor
}

enum OrderStatus {
  CUTTING_IN_PROGRESS
  PENDING_VERIFICATION
  REJECTED
  VERIFIED
}

enum ItemStatus {
  GREEN
  YELLOW
  RED
}

enum Decision {
  APPROVED
  REJECTED
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  fullName     String   @map("full_name")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  ordersCreated CuttingOrder[]    @relation("OrderCreator")
  sewingStarted CuttingOrder[]    @relation("SewingStarter")
  verifications VerificationLog[]

  @@map("users")
}

model Recipe {
  id             String  @id @default(uuid()) @db.Uuid
  recipeCode     String  @unique @map("recipe_code")
  name           String
  category       String
  stdFabricYards Decimal @map("std_fabric_yards") @db.Decimal(6, 2)
  wastageCap     Decimal @map("wastage_cap") @db.Decimal(5, 2)

  components RecipeComponent[]
  orders     CuttingOrder[]

  @@map("recipes")
}

model RecipeComponent {
  id               String  @id @default(uuid()) @db.Uuid
  recipeId         String  @map("recipe_id") @db.Uuid
  componentName    String  @map("component_name")
  piecesPerGarment Int     @map("pieces_per_garment")
  imageUrl         String? @map("image_url")

  recipe Recipe             @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  items  VerificationItem[]

  @@unique([recipeId, componentName])
  @@map("recipe_components")
}

model CuttingOrder {
  id              String      @id @default(uuid()) @db.Uuid
  orderSeq        Int         @unique @default(autoincrement()) @map("order_seq")
  orderNo         String      @unique @map("order_no")
  recipeId        String      @map("recipe_id") @db.Uuid
  targetQty       Int         @map("target_qty")
  fabricRollId    String      @map("fabric_roll_id")
  actualFabricYds Decimal     @map("actual_fabric_yds") @db.Decimal(8, 2)
  status          OrderStatus @default(CUTTING_IN_PROGRESS)
  createdById     String      @map("created_by") @db.Uuid
  createdAt       DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime    @updatedAt @map("updated_at") @db.Timestamptz
  submittedAt     DateTime?   @map("submitted_at") @db.Timestamptz
  verifiedAt      DateTime?   @map("verified_at") @db.Timestamptz
  sewingStartedAt DateTime?   @map("sewing_started_at") @db.Timestamptz
  sewingStartedBy String?     @map("sewing_started_by") @db.Uuid

  recipe    Recipe             @relation(fields: [recipeId], references: [id], onDelete: Restrict)
  createdBy User               @relation("OrderCreator", fields: [createdById], references: [id])
  sewingBy  User?              @relation("SewingStarter", fields: [sewingStartedBy], references: [id])
  items     VerificationItem[]
  logs      VerificationLog[]

  @@index([status, createdAt(sort: Desc)])
  @@index([createdById])
  @@map("cutting_orders")
}

model VerificationItem {
  id          String      @id @default(uuid()) @db.Uuid
  orderId     String      @map("order_id") @db.Uuid
  componentId String      @map("component_id") @db.Uuid
  expectedQty Int         @map("expected_qty")
  actualQty   Int?        @map("actual_qty")
  status      ItemStatus?

  order     CuttingOrder    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  component RecipeComponent @relation(fields: [componentId], references: [id])

  @@unique([orderId, componentId])
  @@index([orderId])
  @@map("verification_items")
}

model VerificationLog {
  id               String   @id @default(uuid()) @db.Uuid
  orderId          String   @map("order_id") @db.Uuid
  verifierId       String   @map("verifier_id") @db.Uuid
  decision         Decision
  rejectionNote    String?  @map("rejection_note")
  wastagePct       Decimal  @map("wastage_pct") @db.Decimal(7, 2)
  varianceSnapshot Json     @map("variance_snapshot")
  timestamp        DateTime @default(now()) @db.Timestamptz

  order    CuttingOrder @relation(fields: [orderId], references: [id])
  verifier User         @relation(fields: [verifierId], references: [id])

  @@index([orderId, timestamp(sort: Desc)])
  @@index([verifierId])
  @@map("verification_logs")
}
```

`order_no` is produced inside the create transaction: insert with a temporary unique value, read `order_seq`, then update `order_no = 'CUT-' || lpad(order_seq::text, 6, '0')`.

### 6.4 Hardening migration (defence in depth at the database)

Create with `npx prisma migrate dev --create-only --name db_hardening`, then paste:

```sql
-- 1) Value guards (mirror the Zod rules)
ALTER TABLE recipes            ADD CONSTRAINT chk_std_fabric_pos   CHECK (std_fabric_yards > 0);
ALTER TABLE recipes            ADD CONSTRAINT chk_wastage_cap_nn   CHECK (wastage_cap >= 0);
ALTER TABLE recipe_components  ADD CONSTRAINT chk_pieces_pos       CHECK (pieces_per_garment > 0);
ALTER TABLE cutting_orders     ADD CONSTRAINT chk_target_qty_pos   CHECK (target_qty > 0 AND target_qty <= 100000);
ALTER TABLE cutting_orders     ADD CONSTRAINT chk_fabric_pos       CHECK (actual_fabric_yds > 0);
ALTER TABLE verification_items ADD CONSTRAINT chk_expected_pos     CHECK (expected_qty > 0);
ALTER TABLE verification_items ADD CONSTRAINT chk_actual_nonneg    CHECK (actual_qty IS NULL OR actual_qty >= 0);
ALTER TABLE verification_logs  ADD CONSTRAINT chk_reject_note
  CHECK (decision <> 'REJECTED' OR (rejection_note IS NOT NULL AND length(btrim(rejection_note)) >= 5));

-- 2) Audit log is append-only (SR-06 / FR-11)
CREATE OR REPLACE FUNCTION forbid_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'verification_logs is append-only' USING ERRCODE = 'P0001';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_logs_immutable
  BEFORE UPDATE OR DELETE ON verification_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_log_mutation();

-- 3) Last-line hard stop: an APPROVED log cannot exist for a short/uncounted order (SR-02)
CREATE OR REPLACE FUNCTION enforce_approval_gate() RETURNS trigger AS $$
BEGIN
  IF NEW.decision = 'APPROVED' THEN
    IF NOT EXISTS (SELECT 1 FROM verification_items WHERE order_id = NEW.order_id)
       OR EXISTS (SELECT 1 FROM verification_items
                  WHERE order_id = NEW.order_id
                    AND (actual_qty IS NULL OR actual_qty < expected_qty)) THEN
      RAISE EXCEPTION 'approval gate: shortage or uncounted component' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_approval_gate
  BEFORE INSERT ON verification_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_approval_gate();

-- 4) Items of a VERIFIED order are frozen
CREATE OR REPLACE FUNCTION lock_verified_items() RETURNS trigger AS $$
DECLARE oid uuid := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
  IF EXISTS (SELECT 1 FROM cutting_orders WHERE id = oid AND status = 'VERIFIED') THEN
    RAISE EXCEPTION 'items of a VERIFIED order are immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_items_frozen
  BEFORE UPDATE OR DELETE ON verification_items
  FOR EACH ROW EXECUTE FUNCTION lock_verified_items();

-- 5) Supabase exposes public tables via PostgREST + anon key: deny everything (D-12)
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_components  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs  ENABLE ROW LEVEL SECURITY;
-- No policies are created ⇒ anon/authenticated roles see nothing.
-- Prisma connects with the privileged database role and is unaffected.
```

> **Order of operations inside the approve transaction:** (1) lock/validate order status, (2) insert APPROVED log (the trigger re-checks items), (3) conditionally update order to VERIFIED. Items are untouched after VERIFIED, so trigger 4 never blocks the legitimate path.
>
> **Test cleanup note:** use `TRUNCATE … CASCADE` in test helpers (row-level triggers do not fire on TRUNCATE) and run tests against a non-production database only.

### 6.5 Seed data (`prisma/seed.ts`, idempotent via upsert)

**Users** (demo-only, bcrypt-hashed in seed):

| Role | Email | Password | Full name |
|---|---|---|---|
| cutting_supervisor | `supervisor@apparelflow.demo` | `Supervisor@123` | Nimali Perera |
| cutting_verifier | `verifier@apparelflow.demo` | `Verifier@123` | Kasun Fernando |
| sewing_supervisor | `sewing@apparelflow.demo` | `Sewing@123` | Dilani Silva |

**Recipes (exactly per spec §7.1):**

| Code | Name | Category | Std fabric | Wastage cap | Components (pieces / garment) |
|---|---|---|---:|---:|---|
| `REC-BL01` | Casual Blouse | Blouse | 1.8 yds | 5.0 % | Front Body Panel 1 · Back Body Panel 1 · Sleeves (Left & Right) 2 · Collar & Stand 1 · Sleeve Cuffs 2 |
| `REC-CT02` | Crop Top | Crop Top | 1.1 yds | 8.0 % | Front Chest Panel 1 · Back Support Panel 1 · Neck Binding Strip 1 · Hem Elastic Casing 1 · Side Strap Accents 2 |

**Worked example (becomes a unit test):** 50 × REC-BL01 ⇒ expected Front 50 · Back 50 · Sleeves 100 · Collar 50 · Cuffs 100; expected fabric `50 × 1.8 = 90.00 yds`; actual `94.50` ⇒ wastage `(94.5 − 90) ÷ 90 × 100 = 5.00 %` (equals the cap — no warning); actual `96.30` ⇒ `7.00 %` (above cap — warning badge, approval still allowed).

**Optional demo orders** (`SEED_DEMO_ORDERS=true`): one `PENDING_VERIFICATION` order with a shortage scenario ready to count, one `PENDING_VERIFICATION` order ready to approve, one `REJECTED` order with a note, one `VERIFIED` order in the sewing queue.

### 6.6 Connection & migration strategy for Supabase + Prisma

| Concern | Decision |
|---|---|
| Runtime connection | `DATABASE_URL` = **pooled** string (port 6543, `?pgbouncer=true&connection_limit=1`) — serverless-safe |
| Migrations | `DIRECT_URL` = direct or **session-pooler** string (port 5432). If the direct host is IPv6-only and your CI/Vercel build cannot reach it, use the session pooler string from the Supabase dashboard |
| Prisma client | Singleton in `lib/db.ts` (global cache in dev to avoid hot-reload connection leaks) |
| Applying migrations | Local: `prisma migrate dev`. Production: `prisma migrate deploy` (in the build script or a manual release step) |
| Seeding | `prisma db seed` (idempotent upserts) |
| Never | `prisma db push` against production; editing an applied migration |

---

## 7. API Documentation

> Publish this section as `docs/API.md` and mirror it in `docs/openapi.yaml` (OpenAPI 3.1). Keep both in the same commit as the code change.

### 7.1 Conventions

| Topic | Rule |
|---|---|
| Base path | `/api` · JSON only (`Content-Type: application/json`) |
| Auth | httpOnly cookie `af_session` (JWT). Not sent in a header or body. Every endpoint except `login` and `health` requires it |
| Success envelope | `{ "data": … }` (lists add `"meta": { "count": n }`) |
| Error envelope | `{ "error": { "code": "…", "message": "…", "details"?: … } }` |
| IDs | UUID v4 strings (validated) |
| Unknown body fields | **Rejected** (`.strict()`) — e.g. a client sending `status`, `verifierId` or `timestamp` gets 400 |
| Timestamps | ISO 8601 UTC, generated by the server only |

**Status codes**

| Code | Meaning | `error.code` examples |
|---:|---|---|
| 200 / 201 | OK / created | — |
| 400 | Malformed or invalid input (type, range, decimals, empty body, unknown field, missing note) | `VALIDATION_ERROR` |
| 401 | No / invalid / expired session | `UNAUTHENTICATED` |
| 403 | Authenticated but role not allowed (or Origin mismatch) | `FORBIDDEN` |
| 404 | Resource missing **or hidden from this role** | `NOT_FOUND` |
| 405 | Method not supported | `METHOD_NOT_ALLOWED` |
| 409 | Illegal state transition / concurrent modification | `INVALID_STATE_TRANSITION`, `CONCURRENT_MODIFICATION` |
| 422 | Business rule violated (hard stop) | `GATE_SHORTAGE`, `GATE_UNCOUNTED` |
| 429 | Login rate limit | `RATE_LIMITED` |
| 500 | Unexpected (generic message, details only in server logs) | `INTERNAL` |

### 7.2 Endpoint catalogue

| # | Method & path | Roles | Purpose | Success |
|--:|---|---|---|:-:|
| 1 | `GET /api/health` | public | Liveness + DB ping | 200 |
| 2 | `POST /api/auth/login` | public | Issue session cookie | 200 |
| 3 | `POST /api/auth/logout` | any auth | Clear cookie | 200 |
| 4 | `GET /api/auth/me` | any auth | Current user (id, name, email, role) | 200 |
| 5 | `GET /api/recipes` | supervisor, verifier | List recipes with components | 200 |
| 6 | `GET /api/recipes/:id` | supervisor, verifier | One recipe | 200 |
| 7 | `POST/PUT/PATCH/DELETE /api/recipes…` | none | Recipe mutation not permitted in this module | 403 |
| 8 | `POST /api/orders` | supervisor | Create order (CUTTING_IN_PROGRESS) | 201 |
| 9 | `GET /api/orders?status=&page=` | supervisor | List orders | 200 |
| 10 | `GET /api/orders/:id` | supervisor | Order detail incl. expected counts, rejection history | 200 |
| 11 | `PATCH /api/orders/:id` | supervisor | Edit while CUTTING_IN_PROGRESS | 200 |
| 12 | `POST /api/orders/:id/submit` | supervisor | → PENDING_VERIFICATION | 200 |
| 13 | `POST /api/orders/:id/recut` | supervisor | REJECTED → CUTTING_IN_PROGRESS | 200 |
| 14 | `GET /api/verification/queue` | verifier | PENDING_VERIFICATION orders | 200 |
| 15 | `GET /api/verification/orders/:id` | verifier | Terminal data (items, statuses, summary) | 200 |
| 16 | `PUT /api/verification/orders/:id/counts` | verifier | Save physical counts (partial allowed) | 200 |
| 17 | `POST /api/verification/orders/:id/approve` | verifier | Approve → VERIFIED | 200 |
| 18 | `POST /api/verification/orders/:id/reject` | verifier | Reject with note → REJECTED | 200 |
| 19 | `GET /api/verification/logs` | verifier | Decision history | 200 |
| 20 | `GET /api/sewing/queue` | sewing | **VERIFIED only** | 200 |
| 21 | `GET /api/sewing/orders/:id` | sewing | VERIFIED order detail + audit | 200 |
| 22 | `POST /api/sewing/orders/:id/start` | sewing | Start Sewing Assembly | 200 |

### 7.3 Endpoint details

#### 2. `POST /api/auth/login`
Request
```json
{ "email": "verifier@apparelflow.demo", "password": "Verifier@123" }
```
Response `200` + `Set-Cookie: af_session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
```json
{ "data": { "id": "…", "fullName": "Kasun Fernando", "email": "verifier@apparelflow.demo", "role": "cutting_verifier" } }
```
Errors: `400` malformed · `401` **generic** "Invalid email or password" (same message and similar timing for unknown email and wrong password) · `429` too many attempts.
JWT claims: `sub` (user id), `iat`, `exp` (8 h). **Role is not trusted from the token** (D-10).

#### 8. `POST /api/orders` (cutting_supervisor)
```json
{ "recipeId": "uuid", "targetQty": 50, "fabricRollId": "FAB-ROLL-882", "actualFabricYds": 94.5 }
```
Validation: `targetQty` integer 1–100000 · `fabricRollId` `^[A-Z0-9-]{3,40}$` · `actualFabricYds` positive, ≤ 2 decimals, ≤ 99999.99 · recipe must exist · no other keys.
Response `201`
```json
{ "data": {
  "id": "uuid", "orderNo": "CUT-000012", "status": "CUTTING_IN_PROGRESS",
  "recipe": { "recipeCode": "REC-BL01", "name": "Casual Blouse" },
  "targetQty": 50, "fabricRollId": "FAB-ROLL-882", "actualFabricYds": 94.5,
  "expectedFabricYds": 90, "wastagePctPreview": 5,
  "expectedComponents": [
    { "componentId": "…", "name": "Sleeve Cuffs", "piecesPerGarment": 2, "expectedQty": 100 }
  ],
  "createdBy": "uuid", "createdAt": "2026-…Z" } }
```
Errors: `400` invalid/negative/decimal qty/empty body · `401` · `403` (verifier, sewing) · `404` recipe not found.

#### 11. `PATCH /api/orders/:id`
Editable fields: `targetQty`, `fabricRollId`, `actualFabricYds` (any subset, ≥ 1 field). Allowed only in `CUTTING_IN_PROGRESS` ⇒ otherwise `409 INVALID_STATE_TRANSITION`. Changing `targetQty` regenerates `expected_qty` for every item in the same transaction.

#### 12. `POST /api/orders/:id/submit`
No body. `CUTTING_IN_PROGRESS → PENDING_VERIFICATION`; sets `submittedAt`. `409` otherwise.

#### 13. `POST /api/orders/:id/recut`
No body. `REJECTED → CUTTING_IN_PROGRESS`; resets item counts/status. Last rejection note remains visible via logs. `409` otherwise.

#### 15. `GET /api/verification/orders/:id` (cutting_verifier)
```json
{ "data": {
  "order": { "id": "…", "orderNo": "CUT-000012", "status": "PENDING_VERIFICATION",
             "recipe": { "recipeCode": "REC-BL01", "name": "Casual Blouse", "wastageCap": 5 },
             "targetQty": 50, "fabricRollId": "FAB-ROLL-882",
             "actualFabricYds": 94.5, "expectedFabricYds": 90, "wastagePct": 5 },
  "items": [
    { "componentId": "…", "name": "Sleeve Cuffs", "imageUrl": "/components/cuff.svg",
      "expectedQty": 100, "actualQty": 98, "status": "RED", "variance": -2 }
  ],
  "summary": { "total": 5, "counted": 5, "red": 1, "yellow": 0, "green": 4,
               "canApprove": false, "blockers": ["Sleeve Cuffs: short by 2"] } } }
```
Only orders currently `PENDING_VERIFICATION` are readable here; others ⇒ `404`.

#### 16. `PUT /api/verification/orders/:id/counts`
```json
{ "counts": [ { "componentId": "uuid", "actualQty": 98 }, { "componentId": "uuid", "actualQty": 100 } ] }
```
Validation: `actualQty` integer ≥ 0 (≤ 1,000,000), no duplicates, every `componentId` must belong to **this order's recipe**, array non-empty. Server **recomputes** each status (client never sends one). Returns the same shape as endpoint 15. Order must be `PENDING_VERIFICATION` else `409`.

#### 17. `POST /api/verification/orders/:id/approve` (cutting_verifier)
**No body fields accepted.** The server loads persisted items and evaluates:

```
if any item missing / actual_qty IS NULL     → 422 GATE_UNCOUNTED
if any item actual_qty < expected_qty (RED)   → 422 GATE_SHORTAGE
else transaction: insert APPROVED log → conditional update to VERIFIED
```
Response `200`
```json
{ "data": { "orderId": "…", "status": "VERIFIED",
            "audit": { "verifierId": "uuid (from session)", "verifierName": "Kasun Fernando",
                       "timestamp": "2026-…Z", "wastagePct": 5.0,
                       "variances": [ { "name": "Sleeve Cuffs", "expected": 100, "actual": 102, "variance": 2, "status": "YELLOW" } ] } } }
```
Errors:
```json
{ "error": { "code": "GATE_SHORTAGE", "message": "Approval blocked: 1 component has a shortage.",
             "details": { "components": [ { "name": "Sleeve Cuffs", "expected": 100, "actual": 98, "short": 2 } ] } } }
```
`401` · **`403` for supervisor/sewing** · `404` · `409` already decided / wrong state · `422` as above.

#### 18. `POST /api/verification/orders/:id/reject`
```json
{ "note": "Cuffs: 2 pieces with fabric flaw, re-cut required." }
```
`note` trimmed 5–500 chars, required ⇒ otherwise `400 VALIDATION_ERROR` (`details.fieldErrors.note`). Creates a REJECTED log (wastage and snapshot recorded), order → `REJECTED`. `409` if not pending.

#### 20. `GET /api/sewing/queue` (sewing_supervisor)
Query params: `page`, `pageSize` (≤ 50) and `startedFilter=all|awaiting|started` only. **No `status` param exists**; if one is sent it is ignored or rejected. The service query is hard-coded:

```ts
prisma.cuttingOrder.findMany({
  where: { status: 'VERIFIED', ...(startedFilter) },   // status is a literal, never from input
  select: sewingQueueSelect,                            // explicit allow-list of columns
  orderBy: { verifiedAt: 'desc' },
});
```
Response item: order summary, `verifiedAt`, `verifier { id, fullName }`, `wastagePct`, `sewingStartedAt`.

#### 21. `GET /api/sewing/orders/:id`
Looks up `{ id, status: 'VERIFIED' }`. Any other order ⇒ `404`. Returns per-component piece counts and variances (from the immutable snapshot), verifier attribution, timestamp, wastage %, rejection history count (informational), and sewing start info.

#### 22. `POST /api/sewing/orders/:id/start`
No body. Conditional update `where { id, status: 'VERIFIED', sewingStartedAt: null }` sets `sewingStartedAt = now()`, `sewingStartedBy = session user`. `409` if already started. `404` if not VERIFIED.

### 7.4 Route × role contract test (generated from §5.5)

For each route and each role (plus *no cookie*), the test asserts the expected status — `401` for anonymous, `403` for disallowed roles, `2xx/4xx-domain` for allowed. This one table-driven test covers FR-18/19/20 and SR-01 for the whole surface.

---

## 8. Security Analysis & Hardening

### 8.1 Assets, actors and trust boundaries

| Asset | Why it matters |
|---|---|
| Order status integrity | The entire purpose: nothing unverified reaches sewing |
| Verification audit trail | Accountability; must be immutable |
| Credentials / JWT secret | Control of identity |
| Database | Single source of truth |

| Actor | Trust level |
|---|---|
| Authenticated supervisor / verifier / sewing user | Trusted **only for their role's actions** |
| Anonymous internet user | Untrusted |
| Evaluator with cURL/Postman/DevTools | Treated as an attacker in capability, not intent |
| Browser/client code | **Always untrusted** |

**Trust boundaries:** Browser ⇄ Route Handlers (everything crossing is hostile input) · Route Handlers ⇄ Database (parameterised via Prisma) · Internet ⇄ Supabase (PostgREST must be sealed by RLS).

### 8.2 Threat model (STRIDE-oriented)

| # | Threat | Example attack | Control(s) | Test |
|---|---|---|---|---|
| S1 | **Spoofing** identity | Forged JWT, `alg: none`, stolen token | `jose.jwtVerify` with pinned `HS256`, secret ≥ 32 bytes, `exp` 8 h, httpOnly+Secure cookie | Tampered/expired/none-alg token ⇒ 401 |
| S2 | Credential stuffing / brute force | Loop on `/auth/login` | bcrypt cost 12, per-IP+email rate limit (best-effort), generic error | 6 rapid failures ⇒ 429 |
| T1 | **Tampering** — status override | `PATCH /orders/:id {status:"VERIFIED"}` | `.strict()` schemas reject `status`; no endpoint accepts status; conditional updates | 400 on unknown key; order unchanged |
| T2 | Tampering — client says "all green" | `approve` with forged counts/status | Approve takes **no body**; server re-derives from DB rows | Body with `counts` ⇒ 400 |
| T3 | Tampering — edit audit | SQL/UPDATE on log | No API; trigger `trg_logs_immutable`; privileged DB credentials never exposed | Direct `UPDATE` in test ⇒ error |
| T4 | Tampering — spoof verifier | `verifierId` in body | Field not accepted; verifier = session user | 400 + log shows session user |
| T5 | Tampering — bypass shortage via race | Two concurrent approvals / save-then-approve | Interactive transaction, conditional update, DB approval-gate trigger | Concurrency test: exactly one succeeds |
| R1 | **Repudiation** | "I never approved that" | Immutable log: user ID, server timestamp, snapshot | Log row asserted in T1 |
| I1 | **Information disclosure** — sewing sees unverified | Change URL id/params; `?status=PENDING` | Hard-coded `status:'VERIFIED'`; 404 for others; role guard on `/api/orders` | **T5** + param-fuzz test |
| I2 | IDOR | Verifier reads a REJECTED order they were not assigned | Status-scoped queries per role; 404 | Matrix test |
| I3 | Leak via PostgREST | Anon key against `/rest/v1/users` | RLS enabled, no policies | Manual check with anon key ⇒ empty/401 |
| I4 | Secret leakage | `.env` committed; stack traces | `.gitignore`, env validation at boot, secret scanning (gitleaks), generic 500 | CI secret scan |
| I5 | Password hash exposure | API returns user row | Explicit `select` allow-lists; DTO mappers | Response-shape test |
| D1 | **Denial of service** | Huge payloads, large `pageSize` | Body-size limit (≤ 100 kB), `pageSize ≤ 50`, array length caps, `quantity` upper bounds | 413/400 tests |
| E1 | **Elevation of privilege** | Supervisor POSTs approve | `requireRole` before any work ⇒ 403 | **T4** |
| E2 | Elevation via stale/forged role claim | Edit JWT role | Role re-read from DB (D-10); signature required | Forged role ⇒ ignored/401 |
| E3 | CSRF | Cross-site form POST using the cookie | `SameSite=Lax`, Origin/Host check on mutating requests, JSON-only content type | Foreign Origin ⇒ 403 |
| E4 | Middleware bypass | Hitting API directly, skipping `middleware.ts` | Auth enforced **inside every route handler**; middleware = UX only; keep Next.js patched | Direct cURL tests |
| E5 | XSS | Rejection note containing `<script>` | React escaping; no `dangerouslySetInnerHTML`; CSP header; notes rendered as text | Render test with payload |
| E6 | SQL injection | Malicious `fabricRollId` | Prisma parameterisation, **no `$queryRawUnsafe`**; Zod pattern | Payload test |

### 8.3 Hardening checklist (implementation tasks)

**Authentication & session**
- [ ] `bcryptjs` cost 12; constant-time compare; for unknown emails run a dummy compare to equalise timing
- [ ] `jose` `SignJWT` (`HS256`, `sub`, `iat`, `exp`); verify with `algorithms: ['HS256']`
- [ ] Cookie `af_session`: `httpOnly`, `secure` (prod), `sameSite: 'lax'`, `path: '/'`, `maxAge: 28800`
- [ ] `getSession(req)` → verify JWT → load user (`id, role, fullName`) from DB → `401` if absent
- [ ] Logout clears cookie (`maxAge: 0`)
- [ ] `JWT_SECRET` validated at boot via Zod (`min(32)`); app refuses to start otherwise

**Authorisation**
- [ ] `withAuth(allowedRoles, handler)` wrapper — a route without it fails a lint/test that scans `app/api/**/route.ts`
- [ ] Role check happens **before** body parsing and before any DB read of business data
- [ ] Permission matrix test iterates every route × role

**Input & output**
- [ ] Zod `.strict()` on every body; parse `params` and `query` too (UUID validation)
- [ ] Integers: `z.number().int().nonnegative()`; reject `"12"` strings, `12.5`, `-1`, `NaN`, `null`, empty body
- [ ] `fabricRollId` pattern; `note` trimmed 5–500 chars
- [ ] Content-Type must be `application/json` for mutating requests; body size capped
- [ ] Response DTOs use explicit `select`; never spread a Prisma row into the response

**Business-rule integrity**
- [ ] All state changes in `prisma.$transaction`; conditional `updateMany` on the expected `from` status
- [ ] Verifier ID and timestamps assigned in the service from `actor` and `new Date()` / DB `now()`
- [ ] DB triggers: append-only logs, approval gate, frozen items (§6.4)
- [ ] Sewing queries contain literal `status: 'VERIFIED'`

**Platform**
- [ ] Security headers in `next.config` `headers()`: `Content-Security-Policy` (self + inline styles needed by Tailwind/Radix; no remote scripts), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`
- [ ] RLS enabled on all tables; confirm anon key returns nothing
- [ ] Secrets only in Vercel/GitHub env settings; `.env*` in `.gitignore`; `.env.example` committed with placeholders
- [ ] `npm audit --omit=dev` in CI; Dependabot enabled; secret scanning enabled
- [ ] Logging: log event + user id + route, **never** passwords, tokens or full request bodies
- [ ] Generic 500 messages; error details only in server logs

**Known, documented limitations (SECURITY.md)**
- Demo credentials are public by design (spec §5 requires a demo panel). They map to least-privilege demo roles only.
- In-memory rate limiting is per serverless instance (best-effort); an Upstash/Redis limiter is the production upgrade.
- No MFA, no password reset, no account lockout beyond rate limiting.
- JWTs are stateless; logout clears the cookie but cannot revoke an already-issued token before `exp` (mitigated by 8 h expiry and DB-read role/user check).

### 8.4 Security regression script (`scripts/security-regression.sh`)

Run against local and production URLs. Every line must print the expected code.

```bash
BASE=${BASE:-http://localhost:3000}
login () { curl -s -c "$1.jar" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$2\",\"password\":\"$3\"}" $BASE/api/auth/login >/dev/null; }
login sup supervisor@apparelflow.demo 'Supervisor@123'
login ver verifier@apparelflow.demo   'Verifier@123'
login sew sewing@apparelflow.demo     'Sewing@123'
ORDER=<id of a PENDING order with a RED item>

echo "anon approve        (401):" $(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/verification/orders/$ORDER/approve)
echo "supervisor approve  (403):" $(curl -s -o /dev/null -w '%{http_code}' -b sup.jar -X POST $BASE/api/verification/orders/$ORDER/approve)
echo "sewing approve      (403):" $(curl -s -o /dev/null -w '%{http_code}' -b sew.jar -X POST $BASE/api/verification/orders/$ORDER/approve)
echo "verifier approve RED(422):" $(curl -s -o /dev/null -w '%{http_code}' -b ver.jar -X POST $BASE/api/verification/orders/$ORDER/approve)
echo "reject no note      (400):" $(curl -s -o /dev/null -w '%{http_code}' -b ver.jar -H 'Content-Type: application/json' -d '{}' $BASE/api/verification/orders/$ORDER/reject)
echo "verifier create order(403):" $(curl -s -o /dev/null -w '%{http_code}' -b ver.jar -H 'Content-Type: application/json' -d '{"recipeId":"x","targetQty":5,"fabricRollId":"A-1","actualFabricYds":5}' $BASE/api/orders)
echo "supervisor sewing q (403):" $(curl -s -o /dev/null -w '%{http_code}' -b sup.jar $BASE/api/sewing/queue)
echo "sewing ?status=PEND (only VERIFIED rows):"; curl -s -b sew.jar "$BASE/api/sewing/queue?status=PENDING_VERIFICATION" | grep -c '"status":"VERIFIED"'
echo "sewing unverified id(404):" $(curl -s -o /dev/null -w '%{http_code}' -b sew.jar $BASE/api/sewing/orders/$ORDER)
echo "forge status field  (400):" $(curl -s -o /dev/null -w '%{http_code}' -b sup.jar -X PATCH -H 'Content-Type: application/json' -d '{"status":"VERIFIED"}' $BASE/api/orders/$ORDER)
echo "negative qty        (400):" $(curl -s -o /dev/null -w '%{http_code}' -b ver.jar -X PUT -H 'Content-Type: application/json' -d '{"counts":[{"componentId":"x","actualQty":-1}]}' $BASE/api/verification/orders/$ORDER/counts)
echo "decimal qty         (400):" $(curl -s -o /dev/null -w '%{http_code}' -b ver.jar -X PUT -H 'Content-Type: application/json' -d '{"counts":[{"componentId":"x","actualQty":1.5}]}' $BASE/api/verification/orders/$ORDER/counts)
echo "tampered cookie     (401):" $(curl -s -o /dev/null -w '%{http_code}' -H 'Cookie: af_session=abc.def.ghi' $BASE/api/auth/me)
```

---

## 9. UI/UX, Contrast & Input-Guard Design

### 9.1 Page map

| Route | Role | Content |
|---|---|---|
| `/login` | public | Login form + **Demo Credential Panel** (three cards: role, email, "Fill" and "Sign in as…") |
| `/supervisor/orders` | supervisor | Orders table (status badges, filters), **Create Order** modal, rejected orders highlighted with last reason and **Re-cut** button |
| `/supervisor/orders/[id]` | supervisor | Detail: expected components, fabric figures, status timeline, submit/edit |
| `/verifier/queue` | verifier | Pending orders awaiting count |
| `/verifier/orders/[id]` | verifier | **Verification Terminal** (see 9.2) |
| `/verifier/history` | verifier | Past decisions with notes |
| `/sewing/queue` | sewing | VERIFIED orders; filter *Awaiting / In assembly / All* |
| `/sewing/orders/[id]` | sewing | Piece counts, variances, verifier attribution + timestamp, wastage %, **Start Sewing Assembly** |

**App shell:** header with logo, role badge, user name, **Role Switcher** (dropdown listing the three personas; selecting one performs a real logout + login with that demo account, visible only when `NEXT_PUBLIC_DEMO_MODE=true`) and Sign out. Navigation shows **only** the current role's links (UX only — the server enforces access).

### 9.2 Verification Terminal design

| Column | Content |
|---|---|
| Component | Name + thumbnail (`image_url`) |
| Per garment | `pieces_per_garment` |
| Expected | `target × pieces` (read-only) |
| Actual (input) | `IntegerInput`, numeric keypad on mobile |
| Variance | `actual − expected` (signed) |
| Status | **Traffic-light chip: icon + text + colour** (GREEN "Match", YELLOW "Excess +n", RED "Shortage −n", grey "Not counted") |

Footer summary bar: *"3 of 5 counted · 1 shortage"*, fabric panel (expected yds, actual yds, wastage %, cap, over-cap warning).
Actions: **Approve Batch** is `disabled` + `aria-disabled` + tooltip *"Resolve shortages / count all components"* whenever any item is RED or uncounted; **Reject Batch** opens a dialog with a required note (inline error, 5–500 chars, character counter).
Behaviour: traffic lights update on every keystroke using the **same `domain/traffic-light.ts`** as the server; "Save counts" persists via `PUT …/counts`; Approve is only enabled when the **server-confirmed** summary says `canApprove` (prevents local-only drift). If the server returns 422 anyway, show the blocking components inline.

### 9.3 Contrast & legibility standard (NFR-01 — zero tolerance)

**Root causes to eliminate** (this is exactly where AI-generated shadcn/Tailwind code fails): inherited `text-foreground` white in a dark-mode variable set, `bg-transparent` inputs on white, Radix Select portals rendering with dark tokens, placeholder colour too light, browser autofill overriding colours.

| Rule | Implementation |
|---|---|
| Light-only theme | Delete the `.dark` variable block from `globals.css`, remove all `dark:` classes, add `html { color-scheme: light; }`, set `<html class="light">` |
| Explicit tokens | `--background: 0 0% 100%` · `--foreground: 222 47% 11%` (slate-900) · `--muted-foreground: 215 19% 35%` (≥ 4.5:1 on white) · `--border: 215 16% 47%` for inputs (≥ 3:1 UI-component contrast) |
| Inputs / Textarea | `bg-white text-slate-900 placeholder:text-slate-500 border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2` |
| Select / dropdown | `SelectTrigger`: same as Input. `SelectContent`: `bg-white text-slate-900 border-slate-300 shadow-md`. `SelectItem`: `focus:bg-slate-100 focus:text-slate-900 data-[state=checked]:font-semibold`. Verify the **portal** content, not just the trigger |
| Disabled | Readable (`disabled:bg-slate-100 disabled:text-slate-600`), never invisible |
| Autofill fix | `input:-webkit-autofill { -webkit-text-fill-color: #0f172a; box-shadow: 0 0 0 1000px #fff inset; }` |
| Status chips | Text + icon, not colour alone: green-800 on green-100 · amber-900 on amber-100 · red-900 on red-100 · slate-700 on slate-100 (each ≥ 4.5:1; verify with axe) |
| Buttons | Primary: white on blue-700/800 (≥ 4.5:1). Destructive: white on red-700. Disabled approve: slate-700 on slate-200 with a visible "not allowed" affordance |
| Focus | 2 px visible ring on every interactive element; never `outline-none` without replacement |
| Error text | red-700 on white, with icon, linked via `aria-describedby`, announced with `aria-live="polite"` |
| Automation | Automated regression test suites verify state transitions, boundaries, and security rules |
| Manual | Click every input and dropdown (as the evaluator will), including Select open state and autofilled login, at 100 % and 200 % zoom |

### 9.4 Defensive input guards (FR-17)

| Control | Client | Server |
|---|---|---|
| Quantity inputs | `IntegerInput`: `type="text"`, `inputMode="numeric"`, `pattern="[0-9]*"`; blocks `e E + - . ,` on keydown and strips pasted non-digits; shows inline error for empty/out-of-range | `z.number().int().min(…).max(…)` (JSON number only; string `"5"` rejected) |
| Fabric yards | Decimal input, max 2 dp, positive | Zod refine: positive, ≤ 2 dp |
| Fabric roll ID | Uppercase mask, pattern hint | Regex `^[A-Z0-9-]{3,40}$` |
| Reject note | Required, 5–500, live counter | Trim + length rules + DB CHECK |
| Empty submit | Inline field errors, focus first invalid field | `400` with `details.fieldErrors` |

Avoid `type="number"` for counts: it accepts `e`, `.`, `-`, scroll-wheel changes and yields `NaN`/coercion bugs — a classic AI-generated flaw worth documenting if you observe it.

### 9.5 Responsive & states

- Mobile ≥ 360 px: tables collapse to stacked cards; Verification Terminal rows become cards with large numeric inputs.
- Every list/detail has **loading** (skeleton), **empty** ("No batches awaiting verification"), and **error** (retry) states.
- Toasts (sonner) for success; inline for validation; blocking `Alert` for 403/422 explanations.
- Keyboard: Radix dialogs trap focus and close on Esc; Enter submits forms; tab order follows visual order.

---

## 10. Testing Strategy

### 10.1 Test pyramid

| Layer | Tool | Runs via | What it proves | Approx. count |
|---|---|---|---|---:|
| Unit (pure domain + validators) | Vitest | `npm test` | Multiplier, traffic light, wastage, state machine, Zod rules | 25–30 |
| Integration (Route Handlers + real Postgres) | Vitest | `npm test` | RBAC, hard stop, query isolation, audit immutability, transitions | 25–30 |
| Security regression | Node / bash + cURL | `scripts/security-regression.mjs` | Direct-API tamper attempts fail cleanly | ~13 checks |

### 10.2 Test infrastructure

- **Database:** separate Postgres — `DATABASE_URL_TEST` (CI: GitHub Actions `postgres` service container; local: Docker). **Never** run tests against production. A guard in `tests/helpers/db.ts` aborts if the URL host matches the production host.
- **Setup:** `vitest.config.ts` → `environment: 'node'`, `fileParallelism: false` (shared DB), `globalSetup` runs `prisma migrate deploy` + seed against the test DB; each file resets data with `TRUNCATE … CASCADE` (row triggers do not fire on TRUNCATE) and re-seeds.
- **Calling handlers directly:** `const res = await POST(makeRequest({ cookie: await loginAs('cutting_verifier'), body }), { params: Promise.resolve({ id }) })`. `loginAs(role)` signs a real JWT with the test secret and the seeded user id.
- **Factories:** `createOrder({ recipe: 'REC-BL01', target: 50 })`, `countAll(order, 'green' | 'shortage' | 'excess')`, `moveTo(order, status)` (direct DB for arranging fixtures only).
- **Scripts:**

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:security": "node scripts/security-regression.mjs",
  "test:all": "npm run lint && npm run typecheck && npm test",
  "typecheck": "tsc --noEmit"
}
```

### 10.3 Mandatory tests (T1–T5) — exact assertions

| ID | File | Arrange → Act → Assert |
|---|---|---|
| **T1** | `integration/approve.test.ts` | Pending order, all components counted == expected (+ a variant with one YELLOW) → verifier `POST approve` → `200`; order `VERIFIED`; one APPROVED log with `verifierId == session user`, non-null timestamp, `wastagePct` computed, snapshot present |
| **T2** | `integration/hard-stop.test.ts` | One component `actual < expected` (RED) → approve → `422 GATE_SHORTAGE`; order still `PENDING_VERIFICATION`; **no** log row; also: uncounted item ⇒ `422 GATE_UNCOUNTED`; also: bypass attempt inserting an APPROVED log directly via Prisma ⇒ DB trigger error |
| **T3** | `integration/reject.test.ts` | Reject with missing / empty / whitespace-only / 4-char note → `400 VALIDATION_ERROR`; order unchanged; valid note → `200`, REJECTED log with note |
| **T4** | `integration/rbac.test.ts` | Supervisor and sewing `POST approve` → `403`; anonymous → `401`; order unchanged; (table-driven for all routes × roles) |
| **T5** | `integration/sewing-isolation.test.ts` | Seed one order per status (CUTTING_IN_PROGRESS, PENDING, REJECTED, VERIFIED) → sewing `GET queue` returns **only** the VERIFIED order; with `?status=PENDING_VERIFICATION`, `?id=…` and other junk params the result is unchanged; direct service-level query asserted too; `GET /api/sewing/orders/:pendingId` ⇒ `404` |

### 10.4 Additional test inventory (edge cases the rubric rewards)

**Unit**
- `multiplier`: 50 blouses ⇒ 50/50/100/50/100; 1 crop top ⇒ 1/1/1/1/2; large qty; zero/negative rejected
- `traffic-light`: `==` GREEN, `>` YELLOW, `<` RED, `0` actual vs positive expected ⇒ RED, `null` ⇒ uncounted
- `wastage`: 94.5 vs 90 ⇒ 5.00; 85 vs 90 ⇒ −5.56 (negative allowed); rounding to 2 dp; expected 0 guarded
- `state-machine`: every legal transition ok; every illegal pair throws
- Zod: negative, `1.5`, `"7"`, `NaN`, `null`, `[]`, `{}`, unknown key, 10 001-char note, bad roll id, yards with 3 dp

**Integration**
- Auth: success sets cookie flags; wrong password / unknown email ⇒ identical 401; expired and tampered tokens ⇒ 401; role in token ignored (user's DB role wins); deleted user ⇒ 401
- Orders: create (201, expected counts correct), other roles ⇒ 403, PATCH only in-progress (409 otherwise), submit twice ⇒ 409, `status`/`createdBy` in body ⇒ 400, recut flow resets counts and preserves logs
- Counts: component from another recipe ⇒ 400; duplicate component ⇒ 400; partial save leaves others uncounted; statuses computed server-side even if client sends `status` (rejected)
- Approve: second approve ⇒ 409; approve a REJECTED order ⇒ 409; approve with body fields ⇒ 400; **concurrency** — two parallel approvals ⇒ exactly one 200, one 409, one log
- Audit: `UPDATE`/`DELETE` on `verification_logs` ⇒ DB error; items of a VERIFIED order cannot change; verifier identity cannot be overridden
- Sewing: start sets `sewingStartedBy` from session; start twice ⇒ 409; start on non-VERIFIED ⇒ 404; status of order remains VERIFIED
- Response shape: no `passwordHash` anywhere; error envelope uniform; 500 hides internals

### 10.5 Automated Quality Gates

`lint` (zero warnings) · `tsc --noEmit` · `vitest run` · coverage on `domain/` and `services/` ≥ 90 % lines · `npm audit --omit=dev` has no high/critical.

---

## 11. Phase-by-Phase Implementation Plan

### 11.0 Schedule overview (30 h, mapped to spec §13)

| Spec day | Spec milestone | Phases | Hours |
|---|---|---|---:|
| **Day 1** | Architecture, Database & Repo | **P0** Planning (1.5) + **P1** Foundations (5.5) | 7.0 |
| **Day 2** | Supervisor & Order Engine | **P2** | 7.0 |
| **Day 3** | Verifier Terminal & Server Hard Stop | **P3** | 8.0 |
| **Day 4** | Sewing Queue, Tests & AI Report | **P4** Sewing/Tests/Report (6.5) + **P5** Hardening & Release (1.5) | 8.0 |
| | | **Total** | **30.0** |

**Cross-cutting habits (all phases)**
- **Atomic commits**, Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `ci:`); target **45–60 commits**; one logical change each; never commit broken `main`.
- Branching: short-lived `feat/*` branches → PR to `main` (self-review checklist) or direct commits on `main` with green checks; keep history linear (squash or rebase).
- **AI log, continuously:** whenever an AI tool produces something wrong, paste the snippet, the symptom and your fix into `docs/ai-notes.md` *immediately* (feeds the final report). Do not reconstruct on Day 4.
- Update `docs/API.md` / `openapi.yaml` in the same commit as any endpoint change.
- End-of-day ritual (10 min): run `npm run test:all`, deploy, smoke-check on the live URL, push.

---

### Phase 0 — Planning & Environment (Day 1 · 1.5 h)

**Goal:** Zero ambiguity and all accounts ready before writing code.

| ID | Task | Est. | Output |
|---|---|---:|---|
| P0.1 | Read the spec twice; confirm this plan's FR/SR/NFR list covers every sentence | 0.5 h | Checked requirement list |
| P0.2 | Confirm decisions D-03 (yards decimals) and D-06 (note length); note them for the README | 0.25 h | Decision log |
| P0.3 | Create **public** GitHub repo; add `.gitignore`, `README` stub, issue/checklist from this plan | 0.25 h | Repo URL |
| P0.4 | Create Supabase project (region near your Vercel region); copy pooled + direct strings; create Vercel project linked to the repo | 0.5 h | Env var inventory |

**Exit criteria:** repo exists; Supabase reachable (`psql` or Prisma Studio); env var list written; no code yet.

---

### Phase 1 — Architecture, Database, Auth & Skeleton Deploy (Day 1 · 5.5 h)

**Goal:** A deployed skeleton with a real database, real auth and the guard infrastructure everything else depends on.

| ID | Task | Est. | Output / commit |
|---|---|---:|---|
| P1.1 | Scaffold Next.js (TS, App Router, Tailwind, ESLint, `src/`), Prettier, scripts | 0.25 h | `chore: scaffold next app` |
| P1.2 | `shadcn init`; add button, input, label, select, dialog, table, badge, card, form, textarea, alert, sonner, dropdown-menu, skeleton; **apply light-only contrast overrides now** (§9.3) | 0.5 h | `feat(ui): shadcn base with high-contrast tokens` |
| P1.3 | Write `schema.prisma` (§6.3); `prisma migrate dev --name init` against Supabase (dev DB) | 1.0 h | `feat(db): initial relational schema` |
| P1.4 | Hardening migration: CHECKs, triggers, RLS (§6.4); verify each trigger manually in SQL editor | 0.75 h | `feat(db): constraints, audit triggers, RLS` |
| P1.5 | `prisma/seed.ts`: 3 users, 2 recipes + components, optional demo orders; placeholder SVGs | 0.75 h | `feat(db): idempotent seed` |
| P1.6 | `lib/`: `env.ts` (Zod), `db.ts` singleton, `errors.ts` (typed errors), `http.ts` (envelope helpers), `auth/{jwt,password,session,guards}.ts`, `withAuth`, `rate-limit.ts` | 1.0 h | `feat(auth): jwt session and rbac guards` |
| P1.7 | `POST /api/auth/login`, `logout`, `GET /api/auth/me`, `GET /api/health`; minimal login page; `middleware.ts` UX redirects | 0.75 h | `feat(auth): login logout me endpoints` |
| P1.8 | First **Vercel deploy**: env vars, build script `prisma generate && next build` (+ `prisma migrate deploy`), run seed once, hit `/api/health` and log in on the live URL | 0.5 h | `ci: vercel deploy and env setup` |

**Exit criteria**
- [ ] Live URL loads; `/api/health` returns DB-ok
- [ ] Login works for all three seeded users on production
- [ ] Wrong password ⇒ generic 401; no cookie ⇒ `/api/auth/me` 401
- [ ] Triggers proven by manual `UPDATE verification_logs` failing
- [ ] `.env.example` committed; no secrets in git history

**Risks:** Supabase IPv6/direct-URL failures (use session pooler for `DIRECT_URL`); pooled URL missing `pgbouncer=true`; Next.js/Prisma version syntax differences.

---

### Phase 2 — Supervisor & Order Engine (Day 2 · 7 h)

**Goal:** A supervisor can create, edit and submit orders; the multiplier engine and the demo/role switcher work; inputs are bulletproof.

| ID | Task | Est. | Output / commit |
|---|---|---:|---|
| P2.1 | `domain/multiplier.ts`, `domain/wastage.ts` + unit tests (worked examples from §6.5) | 0.75 h | `feat(domain): multiplier and wastage engine` |
| P2.2 | `validators/order.schema.ts` (strict, int/2-dp rules, roll-id regex) + unit tests for every bad input | 0.5 h | `feat(validation): strict order schemas` |
| P2.3 | `orders.service.ts` + routes: `POST/GET /orders`, `GET/PATCH /orders/:id`, `submit`, `recut`; transactional create (order + items + `order_no`); state-machine module | 2.0 h | `feat(orders): create edit submit recut` |
| P2.4 | `GET /api/recipes` (+ `:id`), mutation stubs ⇒ 403 | 0.25 h | `feat(recipes): read-only recipe api` |
| P2.5 | App shell: server-side session layout, role-aware nav, header user menu, **Role Switcher** and **Demo Credential Panel** on `/login` | 1.0 h | `feat(ui): app shell and demo role switcher` |
| P2.6 | Supervisor UI: orders table with status badges, **Create Order modal** (recipe select, qty, roll ID, yards) with **live expected-component preview**, save-draft/submit actions, rejected-order banner + Re-cut | 2.0 h | `feat(supervisor): orders page and create modal` |
| P2.7 | `IntegerInput` + shared field components; **contrast pass #1** on every control built so far (click each input and dropdown) | 0.5 h | `fix(ui): input guards and contrast pass` |

**Exit criteria**
- [ ] Creating 50 × Casual Blouse shows Cuffs = 100 live in the modal and in the API response
- [ ] Negative, decimal, text and empty values show inline errors; API returns 400 for the same payloads via cURL
- [ ] Verifier / Sewing receive 403 on `POST /api/orders`; Verifier does not see Create Order
- [ ] Order persists across refresh; submit moves it to PENDING_VERIFICATION
- [ ] Unit tests for multiplier, wastage, validators green

---

### Phase 3 — Verifier Terminal & Server Hard Stop (Day 3 · 8 h)

**Goal:** The mission-critical gate: live traffic lights, a server hard stop that cannot be bypassed, rejection flow and immutable audit.

| ID | Task | Est. | Output / commit |
|---|---|---:|---|
| P3.1 | `domain/traffic-light.ts` (shared client + server) + exhaustive unit tests | 0.5 h | `feat(domain): traffic light evaluator` |
| P3.2 | `verification.service.ts`: `saveCounts`, `approve` (transaction: re-derive → insert log → conditional update), `reject`; wastage + snapshot build; DB-error → `GATE_*` mapping | 2.0 h | `feat(verification): approve reject services` |
| P3.3 | Routes: `queue`, `orders/:id`, `counts`, `approve`, `reject`, `logs`; strict schemas; `withAuth(['cutting_verifier'])`; error mapping (400/403/404/409/422) | 1.25 h | `feat(verification): api routes with hard stop` |
| P3.4 | Verifier UI: queue, **Verification Terminal** (rows, live chips, variance, summary bar, fabric/wastage panel), disabled Approve, **Reject dialog** with required note, 422 blocker display | 2.5 h | `feat(verifier): verification terminal ui` |
| P3.5 | Audit views: verifier history; supervisor sees rejection reason + history on order detail; VERIFIED audit panel component (reused in Phase 4) | 0.75 h | `feat(audit): history and audit panel` |
| P3.6 | Manual hard-stop proof with cURL (RED ⇒ 422; wrong role ⇒ 403; no body fields) + first integration tests **T1, T2** + concurrency test | 1.0 h | `test(verification): T1 T2 and race test` |

**Exit criteria**
- [ ] Enter a shortage ⇒ RED, Approve disabled, API still returns 422 when called directly
- [ ] All GREEN (and GREEN+YELLOW) ⇒ approve succeeds; log row holds verifier id (from session), timestamp, variances, wastage %
- [ ] Reject without note ⇒ inline error and API 400; with note ⇒ supervisor sees it
- [ ] Direct `UPDATE verification_logs` fails; forged `verifierId` field ⇒ 400
- [ ] Double-approve ⇒ 409

**Risks:** client/server traffic-light divergence (single shared function); stale UI enabling Approve (server-confirmed `canApprove`); Prisma transaction timeouts on pooled connections (keep transaction short, no network calls inside).

---

### Phase 4 — Sewing Queue, Test Suite, Contrast Audit & AI Report (Day 4 · 6.5 h)

**Goal:** Complete the pipeline, finish the full automated suite and write the AI report with real findings.

| ID | Task | Est. | Output / commit |
|---|---|---:|---|
| P4.1 | `sewing.service.ts` + routes: `queue` (literal `status:'VERIFIED'`, allow-listed select, param-ignoring), `orders/:id` (404 for non-VERIFIED), `start` (conditional update) | 1.25 h | `feat(sewing): isolated queue and start assembly` |
| P4.2 | Sewing UI: queue (filter awaiting/in assembly), detail with piece counts, variances, verifier attribution, timestamp, wastage %, audit notes, **Start Sewing Assembly** | 1.5 h | `feat(sewing): queue and detail ui` |
| P4.3 | Finish Vitest suite: **T1–T5** + the inventory in §10.4; permission-matrix test; coverage check | 1.5 h | `test: complete integration suite` |
| P4.4 | Automated security regression tests; CI job | 1.25 h | `test(security): regression suite` |
| P4.5 | Full **contrast & responsive audit** (every input, dropdown open state, dialogs, 360 px and 1280 px); fix findings | 0.5 h | `fix(ui): contrast and responsive findings` |
| P4.6 | Write `AI_OPTIMIZATION_REPORT.md` from `docs/ai-notes.md` (§13.2) | 0.5 h | `docs: ai optimization report` |

**Exit criteria**
- [ ] `npm test` green locally and in CI; E2E green
- [ ] Sewing queue never shows non-VERIFIED data under any param manipulation
- [ ] Axe reports zero contrast violations on all pages
- [ ] AI report contains ≥ 2 genuine flawed-AI instances with code and fixes

---

### Phase 5 — Hardening, Docs & Release (Day 4 · 1.5 h)

| ID | Task | Est. | Output / commit |
|---|---|---:|---|
| P5.1 | Finish `README.md`, `docs/API.md`, `docs/openapi.yaml`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md` (§13.1) | 0.5 h | `docs: readme api security architecture` |
| P5.2 | Run `security-regression.sh` against local **and** production; fix any mismatch; confirm RLS with anon key | 0.25 h | `test: security regression script` |
| P5.3 | Production release: `migrate deploy`, seed, smoke test, rehearse the evaluator's 5-minute audit on the **live URL** with a clean browser profile (§14.2) | 0.5 h | `chore: production release v1.0.0` |
| P5.4 | Final submission checklist (§14.1), tag `v1.0.0`, verify repo is public and links work | 0.25 h | tag |

**Exit criteria:** every box in §14.1 ticked.

---

### 11.1 Example atomic commit sequence (illustrative)

```
chore: scaffold next app with tailwind and eslint
feat(ui): add shadcn base components with high-contrast tokens
feat(db): add prisma schema for users recipes orders verification
feat(db): add hardening migration (checks, triggers, rls)
feat(db): seed demo users and REC-BL01 / REC-CT02 recipes
feat(auth): add jwt signing, session loader and role guards
feat(auth): add login, logout and me endpoints
ci: add github actions (lint, typecheck, test, build)
feat(domain): add component multiplier and wastage calculators
test(domain): cover multiplier and wastage worked examples
feat(validation): strict zod schemas for orders
feat(orders): create and list cutting orders with expected counts
feat(orders): submit, edit and recut state transitions
feat(ui): app shell with role-aware nav and role switcher
feat(supervisor): create order modal with live component preview
fix(ui): force light theme to resolve white-on-white inputs
feat(domain): traffic-light evaluator shared by client and server
feat(verification): save counts and compute statuses server-side
feat(verification): approve with transactional hard stop
feat(verification): reject with mandatory note
test(verification): T1 approve all-green, T2 block shortage
feat(verifier): verification terminal with live traffic lights
feat(audit): immutable audit panel and verifier history
feat(sewing): verified-only queue with literal status filter
feat(sewing): start assembly endpoint and ui
test: T3 reject note, T4 rbac 403, T5 queue isolation
test(security): regression suite and contrast audit
docs: ai optimization report
docs: readme, api reference, security notes
chore: release v1.0.0
```

---

## 12. Deployment, CI/CD & Operations

### 12.1 Environments

| Environment | App | Database | Purpose |
|---|---|---|---|
| Local | `next dev` | Supabase dev project **or** local Docker Postgres | Development |
| CI | GitHub Actions runner | Postgres **service container** | Lint, typecheck, tests, build |
| Preview | Vercel preview per PR/branch | Same Supabase project as production **or** a second dev project | Review before merge |
| Production | Vercel production | Supabase production project | Evaluator-facing URL |

> Use a **separate database for tests** at all times. If you only want one Supabase project, keep tests in CI against the container and never point `DATABASE_URL_TEST` at it.

### 12.2 Environment variables

| Variable | Scope | Example / notes |
|---|---|---|
| `DATABASE_URL` | Vercel (prod/preview), local | Pooled: `postgresql://postgres.<ref>:<pw>@<pooler-host>:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Vercel (build), local, CI | Direct or session-pooler (5432). Copy the exact strings from the Supabase dashboard |
| `JWT_SECRET` | Vercel, local, CI | ≥ 32 random bytes: `openssl rand -base64 48` (different per environment) |
| `JWT_EXPIRES_IN` | all | `8h` |
| `NEXT_PUBLIC_DEMO_MODE` | all | `true` (shows Demo Credential Panel + Role Switcher) |
| `SEED_DEMO_ORDERS` | seed only | `true` / `false` |
| `DATABASE_URL_TEST` | local, CI | Test Postgres; helper aborts if it equals production host |
| `APP_ORIGIN` | Vercel | `https://<project>.vercel.app` (used by the Origin check) |

Validate all of them in `lib/env.ts` with Zod; fail fast at boot with a clear message. Only `NEXT_PUBLIC_*` values may reach the browser.

### 12.3 Build & release scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "build:vercel": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "lint": "next lint --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:security": "node scripts/security-regression.mjs"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

Set Vercel's build command to `npm run build:vercel` so migrations are applied automatically on each production deploy. Seed once manually (`npm run db:seed` with production env) — seeding is idempotent, so re-running is safe.

### 12.4 Supabase setup checklist

- [ ] Create project in a region close to the Vercel function region; save the DB password in a password manager
- [ ] Copy pooled (6543) and direct/session (5432) strings from the dashboard
- [ ] Apply migrations (`migrate deploy`) and seed
- [ ] Confirm RLS is **enabled** on all six tables (Table Editor shows the shield)
- [ ] Test the anon key against `/rest/v1/users` ⇒ no rows / not authorised
- [ ] **Free-tier projects pause after a period of inactivity** — open the project and hit `/api/health` shortly before submission *and* before the evaluator's expected review window; note the keep-alive step in the README

### 12.5 Vercel setup checklist

- [ ] Import the GitHub repo; framework preset Next.js; Node LTS
- [ ] Add env vars for Production **and** Preview
- [ ] Build command `npm run build:vercel`
- [ ] Production branch = `main`; confirm the deployment URL is public (no deployment protection / password) so evaluators can open it
- [ ] Optionally pin the function region next to the Supabase region to cut latency

### 12.6 CI pipeline (`.github/workflows/ci.yml`)

```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: apparelflow_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/apparelflow_test
      DIRECT_URL:   postgresql://postgres:postgres@localhost:5432/apparelflow_test
      DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/apparelflow_test
      JWT_SECRET: ci-only-secret-at-least-32-characters-long-xxxx
      APP_ORIGIN: http://localhost:3000
      NEXT_PUBLIC_DEMO_MODE: 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx prisma validate
      - run: npx prisma migrate deploy
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm audit --omit=dev --audit-level=high
      - run: npm run build
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
```

Vercel's Git integration handles deployment; CI gates merging by status check. Keep the CI badge in the README.

### 12.7 Post-deploy smoke test (`scripts/smoke.sh`)

1. `GET /api/health` ⇒ `200` and `db: "ok"`
2. Login as each role ⇒ `200` + cookie with `HttpOnly; Secure; SameSite=Lax`
3. Verifier lists queue; supervisor creates an order; submit; verifier counts; approve; sewing queue contains it
4. Re-run `security-regression.sh` against production
5. Reload in a clean browser profile: data still present

### 12.8 Rollback, observability & operations

| Topic | Approach |
|---|---|
| Rollback app | Vercel "Instant Rollback" to the previous deployment |
| Rollback schema | Forward-only migrations; write a corrective migration rather than editing history |
| Backups | Supabase managed backups (note plan limits); seed is reproducible from code |
| Logging | Structured JSON via a tiny logger (event, userId, route, status, durationMs); never log secrets or bodies |
| Monitoring | `/api/health`; Vercel logs; optional uptime ping to keep the free DB awake before the review window |
| Cold starts / pooling | Prisma singleton; `connection_limit=1` on pooled URL |

---

## 13. Documentation Deliverables (README + AI Report)

### 13.1 `README.md` outline (REQUIRED)

1. Title, live URL, CI badge, one-paragraph problem statement
2. **Demo credentials** table for all three roles (+ note "demo-only accounts")
3. 5-minute evaluator walkthrough (mirrors §14.2)
4. Architecture summary (diagram from §5.1, layer rules, request lifecycle)
5. State machine diagram and transition table
6. **Database schema documentation** (ERD from §6.1, table dictionary, triggers explained)
7. Security model (RBAC matrix, hard-stop layers, query isolation, JWT/cookie, limitations)
8. API summary + link to `docs/API.md` and `docs/openapi.yaml`
9. Setup: prerequisites, `.env.example`, `npm i`, `prisma migrate dev`, `db:seed`, `npm run dev`
10. Testing: `npm test`, `npm run test:e2e`, what is covered (T1–T5 table)
11. Deployment notes (Vercel + Supabase, pooled vs direct URL, keep-alive note)
12. Design decisions D-01…D-14 and known limitations
13. Project structure, repo conventions (conventional commits)
14. Link to `AI_OPTIMIZATION_REPORT.md`

### 13.2 `AI_OPTIMIZATION_REPORT.md` — structure and honesty rules

> **Honesty rule:** document only what actually happened. Evaluators are explicitly looking for genuine auditing. Capture issues **as you hit them** in `docs/ai-notes.md` (snippet · symptom · root cause · fix · commit hash). Never invent an incident.

| Section | Required content | What to include |
|---|---|---|
| **1. Tools & Prompting** | Which AI tools, for which tasks | Table: tool → task (scaffolding, schema design, styling, test generation, refactors) → example prompt style → how much was kept/rewritten |
| **2. Flawed / Broken AI Code** | **≥ 2 specific instances** | For each: the generated snippet, how you detected it, why it was wrong, impact, commit that fixed it |
| **3. Human Refactoring** | How you rewrote and hardened | Before/after diffs: what changed, why your judgment differed from the AI's |
| **4. Defensive Architecture** | State machine + API guards | Explain transition map, conditional updates, `withAuth`, strict schemas, DB triggers, literal `VERIFIED` filter, session-derived identity |

**Categories to *look for* while reviewing AI output** (use only the ones you actually observe):
- Client-only RBAC (hidden buttons/tabs with no server check) or middleware-only protection
- Approve endpoints that trust a client-sent status/counts, or accept `verifierId`/timestamps from the body
- Sewing queue filtering in JavaScript after fetching all rows, or building `where` from query params
- `type="number"` inputs accepting `e`, `.`, `-`; `parseInt` coercion of `"12abc"`; `Number("")` → `0`
- shadcn/Tailwind dark-mode variables producing white-on-white inputs; Select portal content unreadable; placeholder too light; autofill overrides
- `useEffect` re-fetch/render loops, stale state after mutation (missing query invalidation)
- Non-transactional multi-step writes; race conditions on approve; mutable audit rows
- Prisma `Decimal` serialisation surprises (strings in JSON), timezone/date mistakes
- Tests that assert implementation details or mock away the database so the hard stop is never really exercised
- Hallucinated APIs/options (e.g., non-existent Prisma or Next.js function arguments)

### 13.3 Other documents

| File | Content |
|---|---|
| `docs/API.md` / `docs/openapi.yaml` | §7 verbatim, kept in sync |
| `docs/SECURITY.md` | §8 threat table, controls, limitations, how to run the regression script |
| `docs/ARCHITECTURE.md` | §5 and §6 with diagrams |
| `docs/ai-notes.md` | Running log feeding the AI report |

---

## 14. Submission Checklist & Evaluator Audit Rehearsal

### 14.1 Mandatory deliverables (spec §14)

| Deliverable | Format / location | Status |
|---|---|:-:|
| **Live Deployed URL** — STRICT | Public Vercel URL, live and testable, DB not paused | ☐ |
| **GitHub Repository** — STRICT | Public; atomic commit history showing iterative development | ☐ |
| **AI_OPTIMIZATION_REPORT.md** — STRICT | Repo root; all 4 sections; ≥ 2 flawed-AI instances | ☐ |
| **README.md** — REQUIRED | Architecture summary, schema docs, demo credentials for all 3 roles | ☐ |
| **Automated test suite** — REQUIRED | `npm test` passes (T1–T5 + extras); E2E documented | ☐ |

### 14.2 Rehearsal of the evaluator's 5-minute technical audit (spec §16)

Run this on the **production URL in a fresh browser profile** the day you submit and again on the final morning.

| # | Evaluator step | Expected result | ☐ |
|--:|---|---|:-:|
| 1 | **Contrast audit** — click every input and dropdown (login, create-order modal incl. recipe Select open, qty, roll ID, yards, count inputs, reject note, search/filters) | Dark legible text on light backgrounds in every state; placeholders and dropdown items readable | ☐ |
| 2 | **RBAC check** — switch to Verifier | No Create Order button; direct `POST /api/orders` ⇒ 403 | ☐ |
| 3 | Switch to Sewing | Pending/rejected/in-progress orders invisible; `?status=` tricks change nothing | ☐ |
| 4 | **Shortage hard stop** — in Verifier Terminal enter a shortage | RED chip; **Approve Batch disabled**; direct API approve ⇒ 422 | ☐ |
| 5 | **Sewing handoff** — approve a valid GREEN batch | Appears in Sewing Queue with verifier name, timestamp, variances, wastage % | ☐ |
| 6 | Refresh the browser | Everything persists | ☐ |
| 7 | Start Sewing Assembly | "In assembly" shown; second start blocked | ☐ |
| 8 | **Code & AI report** — inspect GitHub commits, test pass, AI report | Atomic commits; CI green; genuine audit evidence | ☐ |

### 14.3 Rubric self-assessment (tick only with evidence)

| Dimension (weight) | Evidence to point at |
|---|---|
| Domain & Business Logic (15) | Seed recipes, `domain/*` tests, worked example |
| Gatekeeper Hard Stop (20) | T2, E3, trigger test, cURL 422 |
| Role Isolation & RBAC (15) | T4, matrix test, security script |
| Database & Architecture (15) | ERD, migrations, triggers, transactions |
| UI Contrast & Usability (15) | Axe E1, manual click-through, responsive screenshots |
| Tests & Edge Cases (10) | Test inventory, CI badge |
| AI Candor (10) | Report with real incidents + fix commits |

---

## 15. Risk Register & Definition of Done

### 15.1 Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|--:|---|:-:|:-:|---|
| R1 | White-on-white or low-contrast input slips through (zero-tolerance) | Med | **High** | Light-only theme from Day 1; axe on every page; manual click-through P2.7, P4.5, §14.2 |
| R2 | Hard stop enforced only in UI | Low | **High** | Service + DB trigger + T2 + cURL script |
| R3 | Supabase free project paused / DB unreachable at review time | Med | **High** | Keep-alive hit before submission; note in README; health check |
| R4 | Prisma + Supabase pooler misconfiguration (prepared statements, migrations) | Med | Med | `pgbouncer=true`, separate `DIRECT_URL`, test migrate on Day 1 |
| R5 | Time overrun on Verifier UI (Day 3) | Med | Med | Build API + tests first; UI second; defer polish |
| R6 | Flaky E2E tests | Med | Low | Deterministic seed, per-role storage state, no arbitrary sleeps, trace on retry |
| R7 | Race conditions on approval | Low | Med | Conditional updates + transaction + concurrency test |
| R8 | Secrets committed | Low | **High** | `.gitignore`, gitleaks CI, `.env.example` only |
| R9 | AI report looks generic | Med | Med | Capture incidents live in `docs/ai-notes.md`; include code + commit hashes |
| R10 | Next.js / Prisma major-version syntax drift | Low | Med | Pin versions; follow current docs; keep Phase 1 skeleton deploy early |
| R11 | Evaluator interprets "no decimals" to include fabric yards | Low | Low | Documented D-03; one-line constant to switch to integer yards |

### 15.2 Definition of Done (project level)

- [ ] All FR/SR/NFR items in §2 implemented and traceable to a test
- [ ] T1–T5 pass in `npm test`; coverage gate met; CI green on `main`
- [ ] Zero axe contrast violations; manual input/dropdown click-through passed
- [ ] Hard stop proven at UI, API (422) and DB-trigger layers
- [ ] RBAC matrix verified (401/403/404 behaviour) for every route
- [ ] Production deployed, migrated, seeded; smoke + security scripts pass on the live URL
- [ ] RLS enabled and anon-key access verified blocked
- [ ] Public repo with ≥ 40 atomic commits; no secrets in history
- [ ] README, API docs, SECURITY, ARCHITECTURE, AI report complete
- [ ] §14.1 and §14.2 fully ticked

---

## 16. Appendices

### Appendix A — Core code skeletons

**A.1 Traffic-light evaluator (`src/domain/traffic-light.ts`)**
```ts
export type ItemStatus = 'GREEN' | 'YELLOW' | 'RED';

export function evaluateItem(expected: number, actual: number | null): ItemStatus | null {
  if (actual === null || actual === undefined) return null;      // uncounted
  if (actual === expected) return 'GREEN';
  return actual > expected ? 'YELLOW' : 'RED';
}

export function summarize(items: { expected: number; actual: number | null }[]) {
  const statuses = items.map(i => evaluateItem(i.expected, i.actual));
  const red = statuses.filter(s => s === 'RED').length;
  const uncounted = statuses.filter(s => s === null).length;
  return {
    total: items.length,
    counted: items.length - uncounted,
    red, uncounted,
    yellow: statuses.filter(s => s === 'YELLOW').length,
    green: statuses.filter(s => s === 'GREEN').length,
    canApprove: items.length > 0 && red === 0 && uncounted === 0,
  };
}
```

**A.2 Wastage (`src/domain/wastage.ts`)**
```ts
export const expectedFabric = (targetQty: number, stdYardsPerPiece: number) =>
  round2(targetQty * stdYardsPerPiece);

export function wastagePct(actualYds: number, expectedYds: number) {
  if (expectedYds <= 0) throw new Error('expected fabric must be positive');
  return round2(((actualYds - expectedYds) / expectedYds) * 100);
}
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
```
(Use `Decimal` from Prisma for persistence; convert to number only at the edge, and test the rounding.)

**A.3 Guards (`src/lib/auth/guards.ts`)**
```ts
export const PERMISSIONS = {
  'orders:write':       ['cutting_supervisor'],
  'orders:read':        ['cutting_supervisor'],
  'recipes:read':       ['cutting_supervisor', 'cutting_verifier'],
  'verification:*':     ['cutting_verifier'],
  'sewing:*':           ['sewing_supervisor'],
} as const;

export function withAuth<T>(
  roles: readonly Role[],
  handler: (ctx: { req: Request; actor: Actor; params: T }) => Promise<Response>,
) {
  return async (req: Request, routeCtx: { params: Promise<T> }) => {
    try {
      assertSameOrigin(req);                           // mutating methods only
      const actor = await getSession(req);             // 401 if invalid; role loaded from DB
      if (!roles.includes(actor.role)) throw new ForbiddenError();
      return await handler({ req, actor, params: await routeCtx.params });
    } catch (e) {
      return toErrorResponse(e);                       // maps typed errors → status + envelope
    }
  };
}
```

**A.4 Approve service (`src/services/verification.service.ts`)**
```ts
export async function approve(actor: Actor, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: { recipe: true, items: { include: { component: true } } },
    });
    if (!order || order.status !== 'PENDING_VERIFICATION')
      throw order ? new ConflictError('INVALID_STATE_TRANSITION') : new NotFoundError();

    const uncounted = order.items.filter(i => i.actualQty === null);
    if (order.items.length === 0 || uncounted.length)
      throw new GateError('GATE_UNCOUNTED', uncounted.map(i => i.component.componentName));

    const short = order.items.filter(i => i.actualQty! < i.expectedQty);
    if (short.length)
      throw new GateError('GATE_SHORTAGE', short.map(toShortDetail));   // → 422

    const expected = expectedFabric(order.targetQty, Number(order.recipe.stdFabricYards));
    const pct = wastagePct(Number(order.actualFabricYds), expected);

    const log = await tx.verificationLog.create({
      data: {
        orderId, verifierId: actor.id,               // ← from session only
        decision: 'APPROVED', wastagePct: pct,
        varianceSnapshot: buildSnapshot(order, expected, pct),
      },
    });                                              // DB trigger re-checks the gate here

    const res = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: 'PENDING_VERIFICATION' },
      data:  { status: 'VERIFIED', verifiedAt: log.timestamp },
    });
    if (res.count !== 1) throw new ConflictError('CONCURRENT_MODIFICATION');
    return toApprovalDto(order, log);
  });
}
```

**A.5 Strict schema example (`src/validators/order.schema.ts`)**
```ts
const twoDp = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-9;

export const createOrderSchema = z.object({
  recipeId: z.string().uuid(),
  targetQty: z.number().int().min(1).max(100000),
  fabricRollId: z.string().regex(/^[A-Z0-9-]{3,40}$/),
  actualFabricYds: z.number().positive().max(99999.99).refine(twoDp, 'Max 2 decimal places'),
}).strict();

export const rejectSchema = z.object({
  note: z.string().trim().min(5, 'Reason is required').max(500),
}).strict();

export const approveSchema = z.object({}).strict();       // approve accepts NO fields
```

**A.6 Sewing queue query (`src/services/sewing.service.ts`)**
```ts
export const listSewingQueue = (_actor: Actor, opts: { page: number; pageSize: number; started?: 'awaiting' | 'started' }) =>
  prisma.cuttingOrder.findMany({
    where: {
      status: 'VERIFIED',                                          // literal — never from input
      ...(opts.started === 'awaiting' && { sewingStartedAt: null }),
      ...(opts.started === 'started' && { sewingStartedAt: { not: null } }),
    },
    select: sewingQueueSelect,                                     // explicit allow-list
    orderBy: { verifiedAt: 'desc' },
    skip: (opts.page - 1) * opts.pageSize,
    take: Math.min(opts.pageSize, 50),
  });
```

### Appendix B — `.env.example`

```bash
# Runtime (pooled, serverless-safe)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrations (direct or session pooler)
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres"

JWT_SECRET="replace-with-openssl-rand-base64-48"
JWT_EXPIRES_IN="8h"
APP_ORIGIN="http://localhost:3000"

NEXT_PUBLIC_DEMO_MODE="true"
SEED_DEMO_ORDERS="false"

# Tests only — must NOT point at production
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/apparelflow_test"
```

### Appendix C — Day-by-day "start of day / end of day" checklist

| Day | Start (5 min) | End (10 min) |
|---|---|---|
| 1 | Open this plan; confirm D-03/D-06 | Live URL + `/api/health` OK; login works in prod; push |
| 2 | Pull; run `test:all` | Create/submit order works in prod; contrast pass #1 done; push |
| 3 | Pull; re-read §5.4 and §8.2 | cURL proves 422/403; T1/T2 green; deploy; push |
| 4 | Pull; list remaining boxes in §14 | §14.1 and §14.2 complete on production; tag `v1.0.0` |

### Appendix D — Glossary

| Term | Meaning |
|---|---|
| BOM / Recipe | Bill of Materials: the cut parts and counts per garment |
| Cut bundle | Stack of cut fabric pieces handed from Cutting to Sewing |
| Expected count | `target_qty × pieces_per_garment` for a component |
| RED / YELLOW / GREEN | Shortage / excess / exact match |
| Hard stop | Server-enforced refusal to approve a batch with any RED or uncounted component |
| Fabric wastage % | `((actual − expected) ÷ expected) × 100` with expected = `target_qty × std_fabric_yards` |
| RBAC | Role-Based Access Control |
| RLS | PostgreSQL Row Level Security |

---

*End of plan. Treat §2 (requirements), §8 (security) and §14 (submission) as the three checklists you return to every day.*
