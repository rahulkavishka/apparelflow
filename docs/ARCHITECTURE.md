# ApparelFlow ERP — Cutting Operations & Gatekeeper Terminal
## System Architecture & Technical Design Specification

### 1. High-Level Architecture Overview

ApparelFlow is engineered as a zero-trust, layered manufacturing execution system. It operates on the core principle:
> **"A cutting batch can never enter the Sewing Queue without explicit verification where every component is counted and none has a shortage (actual < expected) — enforced strictly server-side."**

```
┌────────────────────────────────────────────────────────────────────────┐
│ BROWSER CLIENT (Untrusted Boundary)                                    │
│ • Next.js App Router (React Server & Client Components)                │
│ • Tailwind CSS with Custom Industrial High-Contrast Design System      │
│ • Client Input Guards (IntegerInput numeric filtering)                 │
│ • Dynamic Verification Terminal (Live traffic lights, Gate strip)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS + HttpOnly JWT Cookie (af_session)
┌───────────────────────────────────▼────────────────────────────────────┐
│ API ROUTE HANDLERS (Edge / Node Runtime)                               │
│ • withAuth(roles, handler) RBAC Guard                                  │
│ • Zod Strict Schema Validation (rejection of injected status/keys)     │
│ • Uniform Error Envelope Mapping (toErrorResponse)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Pure TypeScript Data Transfer Objects
┌───────────────────────────────────▼────────────────────────────────────┐
│ DOMAIN & SERVICE LAYER                                                 │
│ • Pure Formula Engines (multiplier.ts, wastage.ts, traffic-light.ts)    │
│ • State Machine Enforcement (state-machine.ts)                         │
│ • Interactive Transactions & Atomic Conditional Updates (updateMany)   │
│ • Cryptographic Session Identity Derivation (actor.id)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Parameterized SQL via Prisma ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│ DATABASE LAYER (Supabase PostgreSQL)                                   │
│ • Relational Schema (6 tables with foreign keys and unique indexes)    │
│ • Enforced Triggers: trg_logs_immutable, trg_approval_gate,            │
│   trg_items_frozen                                                     │
│ • Row Level Security (RLS) Deny-All on PostgREST                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Layer Boundaries & Structural Rules

1. **Client is Untrusted:** The UI never computes whether an approval succeeds. The server deriving the status from stored database rows is the sole authority.
2. **Role Isolation:** Every API route handler is wrapped with `withAuth(allowedRoles, handler)`. Session validation and role re-verification occur *before* any request body parsing or database business query.
3. **No Direct Model Mutation:** Components and routes do not call Prisma directly. All queries and state mutations route through domain services (`orders.service.ts`, `verification.service.ts`, `sewing.service.ts`).
4. **Zero Status Parameterization:** The Sewing Queue query strictly hardcodes `where: { status: 'VERIFIED' }`. No client query parameter can widen this filter.

---

### 3. State Machine & Order Lifecycle

Every cutting order advances through a deterministic finite state machine:

```
[Create Order]
       │
       ▼
┌──────────────────────┐
│ CUTTING_IN_PROGRESS  │◀──────────────┐
└──────────┬───────────┘               │
           │                           │
    submit │                     recut │
           ▼                           │
┌──────────────────────┐               │
│ PENDING_VERIFICATION │               │
└──────────┬───────────┘               │
           │                           │
     ┌─────┴─────────────┐             │
     │                   │             │
     │ approve           │ reject      │
     ▼                   ▼             │
┌──────────┐      ┌──────────┐         │
│ VERIFIED │      │ REJECTED ├─────────┘
└────┬─────┘      └──────────┘
     │
     │ start assembly (status remains VERIFIED)
     ▼
[In Assembly on Sewing Floor]
```

#### Transition Matrix & Guard Rules

| From State | Action | Target State | Authorized Role | Guard Conditions Enforced |
|---|---|---|---|---|
| *None* | `create` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Valid recipe, `targetQty >= 1`, valid roll ID, fabric yards positive. |
| `CUTTING_IN_PROGRESS` | `edit` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Recalculates expected component counts if `targetQty` changed. |
| `CUTTING_IN_PROGRESS` | `submit` | `PENDING_VERIFICATION` | `cutting_supervisor` | Sets `submittedAt` timestamp. |
| `PENDING_VERIFICATION`| `approve`| `VERIFIED` | `cutting_verifier` | **Hard stop:** All components counted (`actual != null`), zero shortages (`actual >= expected`). Triggers `trg_approval_gate`. |
| `PENDING_VERIFICATION`| `reject` | `REJECTED` | `cutting_verifier` | Requires non-empty rejection note (5–500 characters). Creates immutable log. |
| `REJECTED` | `recut` | `CUTTING_IN_PROGRESS` | `cutting_supervisor` | Resets component actual counts to null. Rejection history remains intact. |
| `VERIFIED` | `start` | `VERIFIED` | `sewing_supervisor` | Conditional update on `sewingStartedAt: null`. Preserves `VERIFIED` status (D-02). |

---

### 4. Database Design & Entity Relationship Diagram (ERD)

```
┌──────────────────┐       1:N       ┌────────────────────────┐
│     recipes      ├─────────────────┤   recipe_components    │
│──────────────────│                 │────────────────────────│
│ id (PK)          │                 │ id (PK)                │
│ recipe_code (UQ) │                 │ recipe_id (FK)         │
│ name             │                 │ component_name         │
│ std_fabric_yards │                 │ pieces_per_garment     │
│ wastage_cap      │                 │ image_url              │
└─────────┬────────┘                 └───────────┬────────────┘
          │                                      │
          │ 1:N                                  │ 1:N
          ▼                                      ▼
┌──────────────────┐       1:N       ┌────────────────────────┐
│  cutting_orders  ├─────────────────┤   verification_items   │
│──────────────────│                 │────────────────────────│
│ id (PK)          │                 │ id (PK)                │
│ order_no (UQ)    │                 │ order_id (FK)          │
│ recipe_id (FK)   │                 │ component_id (FK)      │
│ target_qty       │                 │ expected_qty           │
│ fabric_roll_id   │                 │ actual_qty (nullable)  │
│ actual_fabric_yds│                 │ status (nullable)      │
│ status           │                 └────────────────────────┘
│ created_by (FK)  │
│ verified_at      │
│ sewing_started_at│
└─────────┬────────┘
          │
          │ 1:N
          ▼
┌────────────────────────┐
│   verification_logs    │
│────────────────────────│
│ id (PK)                │
│ order_id (FK)          │
│ verifier_id (FK)       │
│ decision (ENUM)        │
│ rejection_note         │
│ wastage_pct            │
│ variance_snapshot(JSON)│
│ timestamp              │
└────────────────────────┘
```

---

### 5. Database Hardening & PostgreSQL Triggers

Four layers of database-level hardening guarantee integrity even against rogue processes or direct SQL injection attempts:

1. **Approval Gatekeeper Trigger (`trg_approval_gate`):**
   ```sql
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
   ```

2. **Immutable Audit Logs Trigger (`trg_logs_immutable`):**
   ```sql
   CREATE OR REPLACE FUNCTION forbid_log_mutation() RETURNS trigger AS $$
   BEGIN
     RAISE EXCEPTION 'verification_logs is append-only' USING ERRCODE = 'P0001';
   END; $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_logs_immutable
     BEFORE UPDATE OR DELETE ON verification_logs
     FOR EACH ROW EXECUTE FUNCTION forbid_log_mutation();
   ```

3. **Verified Items Frozen Trigger (`trg_items_frozen`):**
   ```sql
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
   ```

4. **Supabase Row-Level Security (RLS):**
   All 6 tables enable RLS with zero public access policies, ensuring anonymous PostgREST access via public anon keys yields empty results or access errors.

---

### 6. Mathematical Domain Formulas

#### Component Multiplier Formula
$$\text{Expected Qty} = \text{Target Qty} \times \text{Pieces Per Garment}$$
*Worked Example (REC-BL01 Casual Blouse, Target Qty = 50):*
- Front Body Panel ($1 \times 50$) = 50
- Back Body Panel ($1 \times 50$) = 50
- Sleeves L & R ($2 \times 50$) = 100
- Collar & Stand ($1 \times 50$) = 50
- Sleeve Cuffs ($2 \times 50$) = 100

#### Fabric Wastage Percentage
$$\text{Expected Fabric Yards} = \text{Target Qty} \times \text{Std Fabric Yards}$$
$$\text{Fabric Wastage \%} = \frac{\text{Actual Fabric Yards} - \text{Expected Fabric Yards}}{\text{Expected Fabric Yards}} \times 100$$
*Worked Example (REC-BL01, Std = 1.8 yds, Target Qty = 50, Actual Fabric = 94.5 yds):*
- $\text{Expected Fabric} = 50 \times 1.8 = 90.00\text{ yards}$
- $\text{Wastage \%} = \frac{94.5 - 90.0}{90.0} \times 100 = \frac{4.5}{90.0} \times 100 = \mathbf{5.00\%}$
- Against 5.0% cap: Within cap (no warning).
