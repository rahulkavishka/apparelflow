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