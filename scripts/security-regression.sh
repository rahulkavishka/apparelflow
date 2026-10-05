#!/usr/bin/env bash
# ApparelFlow ERP — Security Regression Test Script (STRIDE Validation)
# Run against local or production environment.
# Every line must output the expected HTTP response status code.

set -e

BASE=${BASE:-http://localhost:3000}
echo "Running ApparelFlow Security Regression against: $BASE"
echo "--------------------------------------------------------"

# Helper for login
login () {
  local jar="$1.jar"
  local email="$2"
  local password="$3"
  curl -s -c "$jar" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    "$BASE/api/auth/login" > /dev/null
}

echo "1. Authenticating test personas..."
login sup "supervisor@apparelflow.demo" "Supervisor@123"
login ver "verifier@apparelflow.demo" "Verifier@123"
login sew "sewing@apparelflow.demo" "Sewing@123"

# Fetch an order ID from verification queue for testing
PENDING_ORDER=$(curl -s -b ver.jar "$BASE/api/verification/queue" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4 || true)

if [ -z "$PENDING_ORDER" ]; then
  # Fallback to dummy UUID if queue is empty
  PENDING_ORDER="00000000-0000-0000-0000-000000000000"
fi

echo "Using Test Order ID: $PENDING_ORDER"
echo "--------------------------------------------------------"

echo -n "Check 01: Anonymous approval blocked               (Expect 401): "
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/verification/orders/$PENDING_ORDER/approve"

echo -n "Check 02: Supervisor approval blocked (RBAC)       (Expect 403): "
curl -s -o /dev/null -w '%{http_code}\n' -b sup.jar -X POST "$BASE/api/verification/orders/$PENDING_ORDER/approve"

echo -n "Check 03: Sewing supervisor approval blocked (RBAC)(Expect 403): "
curl -s -o /dev/null -w '%{http_code}\n' -b sew.jar -X POST "$BASE/api/verification/orders/$PENDING_ORDER/approve"

echo -n "Check 04: Verifier cannot create cutting order     (Expect 403): "
curl -s -o /dev/null -w '%{http_code}\n' -b ver.jar -H 'Content-Type: application/json' \
  -d '{"recipeId":"00000000-0000-0000-0000-000000000000","targetQty":50,"fabricRollId":"ROLL-1","actualFabricYds":50}' \
  "$BASE/api/orders"

echo -n "Check 05: Supervisor cannot access sewing queue    (Expect 403): "
curl -s -o /dev/null -w '%{http_code}\n' -b sup.jar "$BASE/api/sewing/queue"

echo -n "Check 06: Reject without mandatory note rejected   (Expect 400): "
curl -s -o /dev/null -w '%{http_code}\n' -b ver.jar -H 'Content-Type: application/json' \
  -d '{}' "$BASE/api/verification/orders/$PENDING_ORDER/reject"

echo -n "Check 07: Reject with note < 5 chars rejected      (Expect 400): "
curl -s -o /dev/null -w '%{http_code}\n' -b ver.jar -H 'Content-Type: application/json' \
  -d '{"note":"bad"}' "$BASE/api/verification/orders/$PENDING_ORDER/reject"

echo -n "Check 08: Injected status override in order PATCH  (Expect 400): "
curl -s -o /dev/null -w '%{http_code}\n' -b sup.jar -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"VERIFIED"}' "$BASE/api/orders/$PENDING_ORDER"

echo -n "Check 09: Negative physical count rejected         (Expect 400): "
curl -s -o /dev/null -w '%{http_code}\n' -b ver.jar -X PUT -H 'Content-Type: application/json' \
  -d '{"counts":[{"componentId":"00000000-0000-0000-0000-000000000000","actualQty":-5}]}' \
  "$BASE/api/verification/orders/$PENDING_ORDER/counts"

echo -n "Check 10: Float physical count rejected            (Expect 400): "
curl -s -o /dev/null -w '%{http_code}\n' -b ver.jar -X PUT -H 'Content-Type: application/json' \
  -d '{"counts":[{"componentId":"00000000-0000-0000-0000-000000000000","actualQty":12.5}]}' \
  "$BASE/api/verification/orders/$PENDING_ORDER/counts"

echo -n "Check 11: Tampered/forged session cookie           (Expect 401): "
curl -s -o /dev/null -w '%{http_code}\n' -H 'Cookie: af_session=tampered.jwt.signature' "$BASE/api/auth/me"

echo -n "Check 12: Sewing queue query parameter tamper fuzz (Verified only): "
SEWING_RESP=$(curl -s -b sew.jar "$BASE/api/sewing/queue?status=PENDING_VERIFICATION")
if echo "$SEWING_RESP" | grep -q '"status":"PENDING_VERIFICATION"'; then
  echo "FAIL (Leaked non-verified order!)"
else
  echo "PASS (Query isolation intact)"
fi

echo -n "Check 13: Looking up unverified order in sewing    (Expect 404): "
curl -s -o /dev/null -w '%{http_code}\n' -b sew.jar "$BASE/api/sewing/orders/$PENDING_ORDER"

echo "--------------------------------------------------------"
echo "Security regression verification finished."

# Cleanup cookie jars
rm -f sup.jar ver.jar sew.jar
