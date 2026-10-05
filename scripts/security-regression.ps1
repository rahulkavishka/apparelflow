param(
  [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "Running ApparelFlow Security Regression against: $BaseUrl" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"

function Login-Persona($jar, $email, $password) {
  $body = "{""email"":""$email"",""password"":""$password""}"
  & curl.exe -s -c $jar -H "Content-Type: application/json" -d $body "$BaseUrl/api/auth/login" | Out-Null
}

Write-Host "1. Authenticating test personas..." -ForegroundColor Yellow
Login-Persona "sup.jar" "supervisor@apparelflow.demo" "Supervisor@123"
Login-Persona "ver.jar" "verifier@apparelflow.demo" "Verifier@123"
Login-Persona "sew.jar" "sewing@apparelflow.demo" "Sewing@123"

$dummyId = "00000000-0000-0000-0000-000000000000"

function Run-Check($title, $expected, $commandBlock) {
  $code = (& $commandBlock).Trim()
  $status = if ($code -eq $expected) { "PASS" } else { "FAIL (Got $code)" }
  $color = if ($code -eq $expected) { "Green" } else { "Red" }
  Write-Host ("{0,-52} (Expect {1}): " -f $title, $expected) -NoNewline
  Write-Host ("[{0}]" -f $status) -ForegroundColor $color
}

Run-Check "Check 01: Anonymous approval blocked" "401" {
  curl.exe -s -o NUL -w "%{http_code}" -X POST "$BaseUrl/api/verification/orders/$dummyId/approve"
}

Run-Check "Check 02: Supervisor approval blocked (RBAC)" "403" {
  curl.exe -s -o NUL -w "%{http_code}" -b sup.jar -X POST "$BaseUrl/api/verification/orders/$dummyId/approve"
}

Run-Check "Check 03: Sewing approval blocked (RBAC)" "403" {
  curl.exe -s -o NUL -w "%{http_code}" -b sew.jar -X POST "$BaseUrl/api/verification/orders/$dummyId/approve"
}

Run-Check "Check 04: Verifier cannot create cutting order" "403" {
  curl.exe -s -o NUL -w "%{http_code}" -b ver.jar -H "Content-Type: application/json" -d '{\"recipeId\":\"00000000-0000-0000-0000-000000000000\",\"targetQty\":50,\"fabricRollId\":\"ROLL-1\",\"actualFabricYds\":50}' "$BaseUrl/api/orders"
}

Run-Check "Check 05: Supervisor cannot access sewing queue" "403" {
  curl.exe -s -o NUL -w "%{http_code}" -b sup.jar "$BaseUrl/api/sewing/queue"
}

Run-Check "Check 06: Reject without note rejected" "400" {
  curl.exe -s -o NUL -w "%{http_code}" -b ver.jar -H "Content-Type: application/json" -d "{}" "$BaseUrl/api/verification/orders/$dummyId/reject"
}

Run-Check "Check 07: Reject with note < 5 chars rejected" "400" {
  curl.exe -s -o NUL -w "%{http_code}" -b ver.jar -H "Content-Type: application/json" -d '{\"note\":\"bad\"}' "$BaseUrl/api/verification/orders/$dummyId/reject"
}

Run-Check "Check 08: Injected status in order PATCH" "400" {
  curl.exe -s -o NUL -w "%{http_code}" -b sup.jar -X PATCH -H "Content-Type: application/json" -d '{\"status\":\"VERIFIED\"}' "$BaseUrl/api/orders/$dummyId"
}

Run-Check "Check 09: Negative physical count rejected" "400" {
  curl.exe -s -o NUL -w "%{http_code}" -b ver.jar -X PUT -H "Content-Type: application/json" -d '{\"counts\":[{\"componentId\":\"00000000-0000-0000-0000-000000000000\",\"actualQty\":-5}]}' "$BaseUrl/api/verification/orders/$dummyId/counts"
}

Run-Check "Check 10: Float physical count rejected" "400" {
  curl.exe -s -o NUL -w "%{http_code}" -b ver.jar -X PUT -H "Content-Type: application/json" -d '{\"counts\":[{\"componentId\":\"00000000-0000-0000-0000-000000000000\",\"actualQty\":12.5}]}' "$BaseUrl/api/verification/orders/$dummyId/counts"
}

Run-Check "Check 11: Tampered/forged session cookie" "401" {
  curl.exe -s -o NUL -w "%{http_code}" -H "Cookie: af_session=tampered.jwt.signature" "$BaseUrl/api/auth/me"
}

Run-Check "Check 12: Sewing lookup on unverified order" "404" {
  curl.exe -s -o NUL -w "%{http_code}" -b sew.jar "$BaseUrl/api/sewing/orders/$dummyId"
}

Remove-Item -Force -ErrorAction SilentlyContinue sup.jar, ver.jar, sew.jar

Write-Host "--------------------------------------------------------"
Write-Host "All security regression checks completed." -ForegroundColor Cyan
