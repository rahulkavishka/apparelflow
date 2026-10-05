# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

A production-grade, full-stack implementation of the **Cutting Operations & Gatekeeper Verification Terminal** built for Webtezza (Pvt) Ltd.

Governing Law:
> **A cutting batch can never enter the Sewing Queue unless a Cutting Verifier has counted every component and none is RED (short) — enforced strictly server-side (422 Unprocessable Entity, DB trigger, UI disabled button).**

---

## 1. Demo Credentials & Personas

The system features three distinct operational personas. All accounts are seeded with bcrypt salt rounds of 12. A visible **Role Switcher** in the header and **Demo Credential Panel** on the `/login` screen allow evaluators to switch between personas seamlessly (each switch performs a real session logout and authentication round-trip).

| Role | Name | Email | Password | Allowed Capabilities |
|---|---|---|---|---|
| **Cutting Supervisor** | Nimali Perera | `supervisor@apparelflow.demo` | `Supervisor@123` | Create cutting orders, track cutting progress, submit batches to verification, trigger re-cuts on rejected batches. **Blocked from verifying batches and viewing the Sewing Queue.** |
| **Cutting Verifier** | Kasun Fernando | `verifier@apparelflow.demo` | `Verifier@123` | Count physical cut parts, monitor live traffic lights (GREEN/YELLOW/RED), approve batches (with server hard-stop), reject batches (mandatory note). **Blocked from creating orders and viewing the Sewing Queue.** |
| **Sewing Supervisor** | Dilani Silva | `sewing@apparelflow.demo` | `Sewing@123` | View exclusively `VERIFIED` batches with verifier attribution and count variances, click "Start Sewing Assembly". **Strictly blocked from non-verified batches.** |

---

## 2. Architecture & Design Principles

Built adhering to the strict **Instrument Panel** specification defined in [`DESIGN.md`](./DESIGN.md):

- **Zero-Tolerance Contrast Contract:** Light-only theme (`html { color-scheme: light; }`). All inputs, selects, popovers, and dialogs use pure `paper` (`#FFFFFF`) with deep blue-slate `ink` (`#19242F`) and explicit `control-edge` borders (`#68757F`). No white-on-white contrast failures.
- **Typography:** **Atkinson Hyperlegible** for interfaces and body copy (prevents mistaking `0/O`, `1/l/I` on roll IDs like `FAB-ROLL-882`); **Barlow Condensed 600** for high-legibility display numerals and quantities.
- **Color Philosophy:** Indigo (`vat` `#25476B`, `vat-deep` `#1B3652`) is reserved for brand chrome, primary actions, and focus outlines. Status colors (`#2E7D4B` Match, `#A87A00` Excess, `#B8382D` Short) are strictly reserved for item status indicators (circular Lamps) and batch state stamps (rectangular Stamps).
- **Three-Layer Security Boundary:**
  1. **UI Layer:** "Approve Batch" button disabled with clear aria-descriptions if any component is uncounted or RED.
  2. **API Layer (`withAuth`):** Server-side verification guard deriving statuses independently from stored database rows; returns `422 Unprocessable Entity` on any shortage or uncounted item, and `403 Forbidden` on role violations.
  3. **Database Layer (Hardening Trigger):** PostgreSQL trigger `trg_approval_gate` raises an exception aborting any transaction attempting to write an `APPROVED` log if any item has `actual_qty < expected_qty` or `actual_qty IS NULL`.

---

## 3. Database Schema & Hardening

Powered by Supabase PostgreSQL and Prisma ORM:

- `users`: Authenticated factory personnel with unique emails and enum `Role` (`cutting_supervisor`, `cutting_verifier`, `sewing_supervisor`).
- `recipes`: Seeded garment specifications (`REC-BL01` Casual Blouse, `REC-CT02` Crop Top) with standard fabric yardage and wastage caps.
- `recipe_components`: Component BOMs with pieces per garment multipliers (e.g. 50 Casual Blouse order dynamically derives 100 Sleeve Cuffs and 100 Sleeves).
- `cutting_orders`: Production batches with auto-sequenced human-readable order numbers (`CUT-000001`), roll IDs, and statuses (`CUTTING_IN_PROGRESS`, `PENDING_VERIFICATION`, `REJECTED`, `VERIFIED`).
- `verification_items`: Component-level count records with immutable relational constraints once verified.
- `verification_logs`: Append-only immutable audit trail storing decisions (`APPROVED`, `REJECTED`), mandatory rejection notes, verifier session attribution, and full snapshot JSON.

### Database Hardening Triggers
- `trg_logs_immutable`: Forbids `UPDATE` or `DELETE` operations on `verification_logs`.
- `trg_approval_gate`: Enforces at database level that an approved verification log can only be created if every item has been counted and has zero shortages.
- `trg_items_frozen`: Prevents mutation of verification items once an order is marked `VERIFIED`.
- `rls_deny_all`: Row-Level Security enabled on all tables denying anonymous PostgREST access.

---

## 4. Implementation Status

| Phase | Milestone | Scope | Status |
|:---:|---|---|:---:|
| **0** | Planning & Scoping | Environment inventory, decision log (D-01 to D-14), requirements traceability | Completed |
| **1** | Architecture, Database & Auth | Next.js App Router, Prisma ORM, Supabase connection, bcrypt + `jose` JWT auth, RBAC guards, design system tokens | Completed |
| **2** | Supervisor & Order Engine | Multiplier engine, wastage calculator, order service, Create Order modal with live preview, rejected row re-cut flow | Completed |
| **3** | Verifier Terminal & Hard Stop | Traffic light engine, 56px count inputs, Gate strip, server hard stop (422), mandatory rejection dialog | Next |
| **4** | Sewing Queue, Tests & Release | Verified-only queue query isolation, "Start Sewing Assembly", complete E2E & accessibility audit, AI report | Queued |

---

## 5. Local Setup & Execution

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation
```bash
git clone <repo-url> apparelflow
cd apparelflow
cp .env.example .env
npm install
```

Configure your `.env` with your Supabase database pooled URL (`DATABASE_URL`), direct URL (`DIRECT_URL`), and a random 32-character `JWT_SECRET`.

### Database Migration & Seed
```bash
npx prisma migrate deploy
npm run db:seed
```

### Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Running Automated Tests
```bash
npm test
```
Runs Vitest unit and integration suites (verifying multiplier logic, wastage formulas, state machine, auth, and order lifecycles).

---

## 6. Engineering Integrity & AI Audit Notes

Development follows strict discipline: Conventional Commits, clean separation of domain logic, and real-time documentation of flawed AI code patterns in [`docs/ai-notes.md`](./docs/ai-notes.md) which directly feeds the final `AI_OPTIMIZATION_REPORT.md`.
