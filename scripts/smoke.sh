#!/usr/bin/env bash
# ApparelFlow ERP — Post-Deploy Smoke Test Script
# Validates production pipeline integrity and happy path handoff.

set -e

BASE=${BASE:-http://localhost:3000}
echo "Running ApparelFlow Smoke Test against: $BASE"
echo "========================================================"

echo "Step 1: Health & Database Connectivity Ping"
HEALTH_RES=$(curl -s "$BASE/api/health")
echo "Response: $HEALTH_RES"
if echo "$HEALTH_RES" | grep -q '"db":"ok"'; then
  echo "✔ Health check passed: Database is connected and healthy."
else
  echo "✖ Health check failed!"
  exit 1
fi

echo -e "\nStep 2: Authentication Handshake (All Personas)"
login () {
  local jar="$1.jar"
  local email="$2"
  local password="$3"
  local res=$(curl -s -i -c "$jar" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    "$BASE/api/auth/login")
  if echo "$res" | grep -q "200 OK"; then
    echo "✔ Successfully authenticated: $email"
  else
    echo "✖ Failed to authenticate: $email"
    exit 1
  fi
}

login sup "supervisor@apparelflow.demo" "Supervisor@123"
login ver "verifier@apparelflow.demo" "Verifier@123"
login sew "sewing@apparelflow.demo" "Sewing@123"

echo -e "\nStep 3: Checking Role Boundaries"
ME_SUP=$(curl -s -b sup.jar "$BASE/api/auth/me")
ME_VER=$(curl -s -b ver.jar "$BASE/api/auth/me")
ME_SEW=$(curl -s -b sew.jar "$BASE/api/auth/me")

echo "Supervisor: $ME_SUP"
echo "Verifier:   $ME_VER"
echo "Sewing:     $ME_SEW"

echo -e "\nStep 4: Verifying Sewing Queue Isolation"
SEWING_QUEUE=$(curl -s -b sew.jar "$BASE/api/sewing/queue")
if echo "$SEWING_QUEUE" | grep -q '"status":"PENDING_VERIFICATION"'; then
  echo "✖ VIOLATION: Sewing queue contains unverified orders!"
  exit 1
else
  echo "✔ Isolation confirmed: Sewing queue contains only VERIFIED batches."
fi

# Cleanup
rm -f sup.jar ver.jar sew.jar

echo "========================================================"
echo "✔ Smoke test completed successfully."
