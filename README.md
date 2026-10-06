# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

[![CI Status](https://img.shields.io/badge/CI-Passing-2e7d4b.svg)](#9-automated-testing--verification-suite)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.x-25476B.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16%20Turbopack-000000.svg)](https://nextjs.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.19%20Postgres-1B3652.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-High%20Contrast%20Design-25476B.svg)](./DESIGN.md)

ApparelFlow is a full-stack web application implementing the **Cutting Operations & Gatekeeper Verification Terminal** for Webtezza (Pvt) Ltd. It serves as the manufacturing checkpoint that prevents unverified, mismatched, or short cut-fabric bundles from reaching the sewing line.

### Core Business Rule
> **A cutting batch can never enter the Sewing Queue without explicit verification where every component is counted and none has a shortage (`actual < expected`) — enforced strictly server-side (422 Unprocessable Entity, DB trigger, UI disabled button).**

- **Live Deployed Application:** [https://apparelflow.vercel.app](https://apparelflow.vercel.app)
- **Public GitHub Repository:** [https://github.com/rahulkavishka/apparelflow.git](https://github.com/rahulkavishka/apparelflow.git)
- **AI Usage & Optimization Report:** [`AI_OPTIMIZATION_REPORT.md`](./AI_OPTIMIZATION_REPORT.md)
- **Design System Specification:** [`DESIGN.md`](./DESIGN.md)

---

## 1. Demo Credentials & User Personas

The application supports three operational personas. All demo accounts are seeded with pre-hashed passwords (bcrypt cost 12). A **Role Switcher** in the header and the **Demo Credential Panel** on the `/login` screen make it easy to switch between personas:

| Persona | Seeded Email | Password | Role & Access Permissions |
|---|---|---|---|
| **Cutting Supervisor** | `supervisor@apparelflow.demo` | `Supervisor@123` | • Creates cutting orders with dynamic component multipliers.<br>• Tracks order timeline.<br>• Submits completed cuts for verification.<br>• Re-cuts rejected batches.<br>• *Blocked from approving batches and viewing the sewing queue.* |
| **Cutting Verifier** | `verifier@apparelflow.demo` | `Verifier@123` | • Performs physical piece counts per component.<br>• Real-time status chips (GREEN/YELLOW/RED) and gate indicator.<br>• Approves batches (strictly enforced on server).<br>• Rejects defective/short batches with mandatory note (5–500 chars).<br>• *Blocked from creating orders and viewing the sewing queue.* |
| **Sewing Supervisor** | `sewing@apparelflow.demo` | `Sewing@123` | • Views only `VERIFIED` production batches in queue.<br>• Inspects piece counts, component variances, and verifier audit slip.<br>• Starts sewing line assembly.<br>• *Blocked from unverified batches (CUTTING, PENDING, REJECTED).* |

---

## 2. Quick Testing & Audit Walkthrough

Follow these steps to test the verification gate, role boundaries, and audit logging:

1. **Step 1: Check UI Contrast & Input Validation**
   - Open `/login`. Notice the clean light theme, high-contrast text (`#19242F` on `#FFFFFF`), and quick-login buttons.
   - Click **"Sign in as Cutting Supervisor"**.
   - Click **"Create Cutting Order"**. Select a recipe (e.g. Casual Blouse `REC-BL01`).
   - Enter `targetQty: 50`. The preview dynamically calculates expected pieces: **100 Sleeve Cuffs** and **100 Sleeves**.
   - Try typing letters, `e`, `.`, or `-` into the quantity field. The `IntegerInput` component blocks non-digit input.
   - Enter Fabric Roll ID `FAB-ROLL-882`, Actual Fabric `94.5` yds. Click **"Create Order"**.
   - Click **"Submit to Verification"** to move the order from `CUTTING_IN_PROGRESS` $\rightarrow$ `PENDING_VERIFICATION`.

2. **Step 2: Role Access Control (RBAC)**
   - Use the header Role Switcher to switch to **Cutting Verifier**.
   - The supervisor's creation buttons and actions are hidden.
   - Calling `POST /api/orders` directly returns `403 Forbidden`.

3. **Step 3: Verification Terminal & Shortage Hard Stop**
   - Open the submitted order in `/verifier/queue`.
   - The **Gate Strip** displays: `"Gate closed. 5 components still need a count."`
   - The **"Approve Batch"** button is disabled.
   - Enter physical counts: Front Body (50), Back Body (50), Sleeves (100), Collar (50).
   - For **Sleeve Cuffs**, enter `98` (short by 2).
   - A **RED Shortage lamp** appears with signed variance `−2`. The Gate strip updates: `"Gate closed. Sleeve Cuffs is short by 2."`
   - **"Approve Batch" remains disabled**.
   - Bypassing the UI via cURL:
     ```bash
     curl -X POST http://localhost:3000/api/verification/orders/<ID>/approve -b verifier.cookie
     ```
     Returns **`422 Unprocessable Entity` (`GATE_SHORTAGE`)**. In addition, the PostgreSQL trigger `trg_approval_gate` prevents inserting an `APPROVED` log in the database.

4. **Step 4: Rejection Flow with Mandatory Note**
   - Click **"Reject Batch"**.
   - Trying to submit without a note or with fewer than 5 characters is blocked.
   - Enter: `"Sleeve cuffs short by 2 pieces due to fabric defect. Recut required."`
   - Confirm rejection. The batch transitions to `REJECTED` and an immutable audit log is created.
   - Switch back to **Supervisor**: the rejected batch is highlighted with the verifier's note, and clicking **"Re-cut Batch"** resets physical counts while keeping the audit history.

5. **Step 5: Approved Batch & Sewing Queue Isolation**
   - Re-count all components so that each is $\ge \text{expected}$.
   - The Gate strip turns **GREEN**: `"Gate open. All 5 components counted. None short."`
   - Click **"Approve Batch"**.
   - Switch to **Sewing Supervisor** (`/sewing/queue`).
   - The verified batch appears in the sewing queue with verifier name, timestamp, and fabric wastage %.
   - Open batch detail: review the **Audit Stub** and parts ledger.
   - Click **"Start Sewing Assembly"**: status stamps update and repeat start attempts return `409 Conflict`.
   - Appending `?status=PENDING_VERIFICATION` to the URL or querying non-verified IDs returns `404 Not Found`.

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ Client UI (Next.js App Router)                                         │
│ • High-contrast light theme (Atkinson Hyperlegible + Barlow)            │
│ • Defensive IntegerInput (Regex + Keydown + Clipboard sanitization)    │
│ • Dynamic Verification Terminal (Live traffic lights, Gate strip)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS + HttpOnly JWT Cookie (af_session)
┌───────────────────────────────────▼────────────────────────────────────┐
│ API Routes (/src/app/api/**)                                           │
│ • withAuth(allowedRoles, handler) RBAC Guard                           │
│ • Zod .strict() Schema Validation (Rejection of injected fields/status) │
│ • Uniform Error Response Mapping (toErrorResponse)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ DTOs & Domain State Machine
┌───────────────────────────────────▼────────────────────────────────────┐
│ Domain & Services (/src/services/**, /src/domain/**)                   │
│ • Pure Calculations (multiplier.ts, wastage.ts, traffic-light.ts)      │
│ • Transactional State Transitions & Conditional Updates (updateMany)   │
│ • Session-derived Verifier & Supervisor Attributions (actor.id)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Parameterized SQL via Prisma ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│ Supabase PostgreSQL Database                                           │
│ • Tables: users, recipes, components, orders, items, logs              │
│ • Triggers: trg_approval_gate, trg_logs_immutable, trg_items_frozen    │
│ • Row-Level Security (RLS) Deny-All on PostgREST                       │
└────────────────────────────────────────────────────────────────────────┘
```

- **Architecture Details:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **API Reference:** [`docs/API.md`](./docs/API.md)
- **OpenAPI 3.0 Specification:** [`docs/openapi.yaml`](./docs/openapi.yaml)
- **Security Specification:** [`docs/SECURITY.md`](./docs/SECURITY.md)

---

## 4. State Machine & Order Lifecycle

```
[Create Order] ──▶ CUTTING_IN_PROGRESS ──submit──▶ PENDING_VERIFICATION
                          ▲                               │
                          │                     ┌─────────┴─────────┐
                        recut                   │ all GREEN/YELLOW  │ any RED/uncounted
                          │                     ▼                   ▼
                      REJECTED ◀──reject── [Reject Flow]       [Approve Batch]
                                                                    │
                                                                    ▼
                                                                VERIFIED ──▶ [Sewing Queue]
                                                                    │
                                                                    ▼
                                                            [Start Assembly]
```

| Current State | Action | Next State | Role Allowed | Server Guard / Condition |
|---|---|---|---|---|
| *None* | `create` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Multiplier engine generates expected component items. |
| `CUTTING_IN_PROGRESS` | `edit` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Recalculates expected items if target quantity modified. |
| `CUTTING_IN_PROGRESS` | `submit` | `PENDING_VERIFICATION` | `cutting_supervisor` | Sets `submittedAt` timestamp. |
| `PENDING_VERIFICATION`| `approve`| `VERIFIED` | `cutting_verifier` | Blocked if any component is uncounted (422) or short (422). Enforced by trigger `trg_approval_gate`. |
| `PENDING_VERIFICATION`| `reject` | `REJECTED` | `cutting_verifier` | Requires 5–500 char note. Creates immutable audit log. |
| `REJECTED` | `recut` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Resets actual counts to null while preserving rejection log history. |
| `VERIFIED` | `start` | `VERIFIED` | `sewing_supervisor` | Sets `sewingStartedAt`. Status remains `VERIFIED` (D-02). |

---

## 5. Database Schema & Hardening Triggers

### Tables
- **`users`**: Factory personnel with bcrypt password hashes and roles (`cutting_supervisor`, `cutting_verifier`, `sewing_supervisor`).
- **`recipes`**: Garment blueprints (`REC-BL01` Casual Blouse, `REC-CT02` Crop Top) with standard fabric usage and wastage caps.
- **`recipe_components`**: Bill of Materials (BOM) with `pieces_per_garment` multiplier (1 to 2 pieces).
- **`cutting_orders`**: Batches with auto-sequenced order numbers (`CUT-000001`), fabric roll IDs, yardages, and timestamps.
- **`verification_items`**: Component physical count ledger with expected vs actual quantities and status lamps.
- **`verification_logs`**: Append-only audit trail storing decisions, notes, verifier session ID, wastage %, and complete snapshot JSON.

### PostgreSQL Triggers
1. **`trg_approval_gate`:** Fires `BEFORE INSERT` on `verification_logs`. If `decision = 'APPROVED'`, it verifies that all components exist and none have `actual_qty IS NULL` or `actual_qty < expected_qty`. Raises SQL exception `23514` otherwise.
2. **`trg_logs_immutable`:** Fires `BEFORE UPDATE OR DELETE` on `verification_logs`. Raises exception `P0001` (append-only ledger).
3. **`trg_items_frozen`:** Fires `BEFORE UPDATE OR DELETE` on `verification_items`. Blocks modifications to items of orders in `VERIFIED` status.
4. **Row-Level Security (RLS):** Enabled on all tables with a deny-all policy to block direct anonymous PostgREST access.

---

## 6. Security Controls

| Threat Scenario | Implemented Control |
|---|---|
| **Role Spoofing & Session Forgery** | `jose` JWT with `HS256`, 256-bit secret, 8h expiry, HttpOnly/Secure/SameSite=Lax cookie. User role is re-verified from database with a 10s in-memory cache. |
| **Credential Stuffing & IP Spoofing** | bcrypt cost 12 with constant-time dummy hash compare for unknown emails. 3-tier rate limiting (IP+Email, Account Email, and Global IP). |
| **State Tampering** | Zod `.strict()` schemas reject unexpected keys (e.g. injected `status`). Approve endpoint takes no body. |
| **Sewing Queue Information Disclosure** | Sewing service hardcodes `where: { status: 'VERIFIED' }` as a literal query. Query parameter overrides are ignored. Looking up unverified orders returns `404 Not Found`. |
| **Race Conditions on Approval** | Prisma transaction with atomic conditional update (`updateMany` where `status = PENDING_VERIFICATION`). Parallel approvals yield one 200 and one 409. |
| **Audit Log Tampering** | Verifier identity is extracted strictly from the session actor (`actor.id`). Direct SQL edits are blocked by trigger `trg_logs_immutable`. |

---

## 7. Implementation Milestones

- **Phase 0 (Planning & Scoping):** Environment inventory, architectural decisions (D-01 to D-14), requirements traceability.
- **Phase 1 (Database & Auth):** Prisma schema, hardening migrations (triggers, RLS), database seed, JWT auth, `withAuth` RBAC, high-contrast light theme tokens.
- **Phase 2 (Supervisor & Orders):** Multiplier engine, wastage calculator, order service, Create Order modal with live preview, rejected re-cut flow.
- **Phase 3 (Verifier Terminal):** Traffic light engine, Gate strip, server hard stop (422), Reject dialog with 5–500 char note, audit stubs.
- **Phase 4 (Sewing Queue & Testing):** Isolated sewing queue, assembly start, 71 automated test suite (T1–T5), `AI_OPTIMIZATION_REPORT.md`.
- **Phase 5 (Hardening & Documentation):** Documentation (`docs/API.md`, `openapi.yaml`, `SECURITY.md`, `ARCHITECTURE.md`), query cache tuning, v1.0.0 release.

---

## 8. Local Setup & Execution Guide

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL database instance (or Supabase project)

### Installation
```bash
# 1. Clone repository
git clone https://github.com/rahulkavishka/apparelflow.git
cd apparelflow

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, and JWT_SECRET in .env
```

### Database Deployment & Seed
```bash
# Apply migrations to database
npx prisma migrate deploy

# Seed demo users (supervisor, verifier, sewing) and recipes (REC-BL01, REC-CT02)
npm run db:seed
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

---

## 9. Automated Testing & Verification Suite

Run the test suite against the PostgreSQL instance:

```bash
# Run full automated test suite (72 tests across 7 suites)
npm test
```

### Rubric Verification Tests (T1 — T5)

| Test ID | Test File | Verified Requirement | Status |
|:---:|---|---|:---:|
| **T1** | `tests/integration/verification.test.ts` | Approval succeeds (200) when all components are MATCH or EXCESS ($\ge \text{expected}$); creates immutable audit log with session attribution. | **PASSED** |
| **T2** | `tests/integration/verification.test.ts` | Approval blocked on uncounted components (`422 GATE_UNCOUNTED`) and shortages (`422 GATE_SHORTAGE`). Direct DB bypass blocked by `trg_approval_gate`. | **PASSED** |
| **T3** | `tests/integration/verification.test.ts` | Rejection requires a valid note of 5–500 chars (`400 VALIDATION_ERROR` on missing/short notes). Valid note transitions batch to `REJECTED`. | **PASSED** |
| **T4** | `tests/integration/verification.test.ts` | Non-verifier roles receive `403 Forbidden` / `401 Unauthorized` on approval endpoint. | **PASSED** |
| **T5** | `tests/integration/sewing.test.ts` | Sewing queue query returns **strictly `VERIFIED`** orders; URL parameter tampering fails to widen query; non-verified IDs return `404 Not Found`; start assembly is atomic. | **PASSED** |

### Automated Security Regression Script
```bash
# Cross-platform security regression runner (validates all 13 attack checks)
npm run test:security
```

---

## 10. Architectural Decisions (D-01 — D-14)

- **D-01 (Single Verification Checkpoint):** Verification occurs in one stage (`PENDING_VERIFICATION` $\rightarrow$ `VERIFIED` or `REJECTED`).
- **D-02 (Sewing Lifecycle Boundary):** Clicking "Start Sewing Assembly" sets `sewingStartedAt` and `sewingStartedBy` while keeping the order status as `VERIFIED`.
- **D-03 (Fabric Yardage Precision):** Fabric yards use `Decimal(8,2)` with up to 2 decimal places. Piece counts are non-negative integers.
- **D-04 (Append-Only Audit):** Verification logs cannot be updated or deleted. Database trigger `trg_logs_immutable` enforces this.
- **D-05 (Server Derivation):** The client never transmits traffic light statuses (`GREEN`, `YELLOW`, `RED`). The server calculates them dynamically.
- **D-06 (Rejection Note Contract):** Rejection notes are required and must be between 5 and 500 characters.
- **D-07 (Role Isolation):** Each user has one assigned role. No user can verify their own cutting order.
- **D-08 (High-Contrast Light Theme):** Light-only theme with white surfaces (`#FFFFFF`) and dark text (`#19242F`). Dark mode is disabled.
- **D-09 (Defensive Inputs):** Custom `IntegerInput` and `DecimalInput` components block non-digit keystrokes and sanitize clipboard pastes.
- **D-10 (Two-Step Identity & Role Cache):** Signed JWT tokens prove identity, while roles are re-read from the DB behind a 10s in-memory cache; filter tabs and KPI summaries use dataset-wide database aggregations (`groupBy` & `aggregate`).
- **D-11 (Immutable SQL Filter):** The sewing queue SQL query hardcodes `where: { status: 'VERIFIED' }` at the database level.
- **D-12 (PostgREST Sealing):** All database tables have Row-Level Security (RLS) enabled with deny-all policies.
- **D-13 (Sequence Order Numbers):** Human-readable auto-incrementing order numbers follow `CUT-000001` format.
- **D-14 (Documented AI Auditing):** All flawed AI code instances, root causes, and refactors are documented in [`AI_OPTIMIZATION_REPORT.md`](./AI_OPTIMIZATION_REPORT.md).

---

## 11. Project Repository Structure

```
apparelflow/
├── AI_OPTIMIZATION_REPORT.md          # AI auditing, bugs caught & refactoring report
├── DESIGN.md                          # Design system tokens, typography, and contrast rules
├── README.md                          # Main documentation and walkthrough
├── docs/
│   ├── API.md                         # Detailed API reference
│   ├── openapi.yaml                   # OpenAPI 3.0 specification
│   ├── ARCHITECTURE.md                # System architecture, state machine & ERD
│   ├── SECURITY.md                    # Threat model (STRIDE) & hardening report
│   └── ai-notes.md                    # Development log feeding the AI report
├── prisma/
│   ├── schema.prisma                  # Relational database schema
│   ├── seed.ts                        # Idempotent demo users & recipes seed
│   └── migrations/                    # SQL migrations and hardening triggers
├── scripts/
│   ├── security-regression.mjs        # Cross-platform automated security regression test
│   ├── security-regression.sh         # Bash security regression test
│   ├── security-regression.ps1        # PowerShell security regression test
│   └── smoke.sh                       # Post-deploy smoke test script
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── supervisor/orders/     # Cutting supervisor orders table & detail
│   │   │   ├── verifier/              # Verification queue, terminal & history
│   │   │   └── sewing/                # Isolated sewing queue & batch detail
│   │   ├── api/                       # Route handlers with RBAC guards
│   │   ├── login/                     # Login page with Demo Credential Panel
│   │   └── globals.css                # High-contrast light-only CSS tokens
│   ├── components/
│   │   ├── domain/                    # GateStrip, WastageScale, AuditStub, IntegerInput
│   │   └── ui/                        # High-contrast UI primitives
│   ├── domain/                        # multiplier.ts, wastage.ts, traffic-light.ts
│   ├── lib/                           # db.ts, env.ts, errors.ts, auth/ (jwt, session, guards)
│   ├── services/                      # orders.service.ts, verification.service.ts, sewing.service.ts
│   └── validators/                    # Strict Zod schemas (order, counts, rejection)
└── tests/
    ├── integration/                   # T1–T5 integration suites against real PostgreSQL
    └── unit/                          # Formula & traffic light unit tests
```

---

## 12. License & Author
- **Author:** Software Engineering Candidate for Webtezza (Pvt) Ltd
- **Assessment:** Practical Engineering Challenge — Production Batch Verification & Sewing Queue Gate
- **License:** MIT License
