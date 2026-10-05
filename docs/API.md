# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal
## API Reference Specification (RESTful Endpoints & Contracts)

### Standard Envelopes

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "data": { ... }
}
```

#### Error Envelope (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`)
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation of the error",
    "details": { ... }
  }
}
```

---

### HTTP Status Code Semantics

| HTTP Status | Error Code | Description |
|---|---|---|
| `200 OK` | — | Request succeeded. |
| `201 Created` | — | Resource created successfully. |
| `400 Bad Request` | `VALIDATION_ERROR` | Schema validation failure, malformed JSON, or non-numeric/negative quantities. |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing, expired, or cryptographically invalid session cookie. |
| `403 Forbidden` | `FORBIDDEN` | Authenticated user lacks the required role for the resource. |
| `404 Not Found` | `NOT_FOUND` | Resource not found, or non-VERIFIED order requested on sewing endpoints. |
| `409 Conflict` | `INVALID_STATE_TRANSITION` | Transition not permitted by state machine, or double-approval / double-start attempt. |
| `422 Unprocessable Entity` | `GATE_SHORTAGE` | Verification approval blocked: at least one component has `actual < expected`. |
| `422 Unprocessable Entity` | `GATE_UNCOUNTED` | Verification approval blocked: at least one component has not been counted. |
| `429 Too Many Requests` | `RATE_LIMITED` | Too many rapid requests (rate limit exceeded). |
| `500 Internal Error` | `INTERNAL` | Unexpected server fault (stack traces hidden from client). |

---

### Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | Public | `cutting_supervisor` | `cutting_verifier` | `sewing_supervisor` |
|---|---|:---:|:---:|:---:|:---:|
| `/api/health` | `GET` | **Yes** | **Yes** | **Yes** | **Yes** |
| `/api/auth/login` | `POST` | **Yes** | **Yes** | **Yes** | **Yes** |
| `/api/auth/logout` | `POST` | No | **Yes** | **Yes** | **Yes** |
| `/api/auth/me` | `GET` | No | **Yes** | **Yes** | **Yes** |
| `/api/recipes` | `GET` | No | **Yes** | **Yes** | No |
| `/api/recipes/:id` | `GET` | No | **Yes** | **Yes** | No |
| `/api/orders` | `POST` | No | **Yes** | No (403) | No (403) |
| `/api/orders` | `GET` | No | **Yes** | No (403) | No (403) |
| `/api/orders/:id` | `GET` | No | **Yes** | No (403) | No (403) |
| `/api/orders/:id` | `PATCH` | No | **Yes** | No (403) | No (403) |
| `/api/orders/:id/submit` | `POST` | No | **Yes** | No (403) | No (403) |
| `/api/orders/:id/recut` | `POST` | No | **Yes** | No (403) | No (403) |
| `/api/verification/queue` | `GET` | No | No (403) | **Yes** | No (403) |
| `/api/verification/orders/:id` | `GET` | No | No (403) | **Yes** | No (403) |
| `/api/verification/orders/:id/counts` | `PUT` | No | No (403) | **Yes** | No (403) |
| `/api/verification/orders/:id/approve` | `POST` | No | No (403) | **Yes** | No (403) |
| `/api/verification/orders/:id/reject` | `POST` | No | No (403) | **Yes** | No (403) |
| `/api/verification/logs` | `GET` | No | No (403) | **Yes** | No (403) |
| `/api/sewing/queue` | `GET` | No | No (403) | No (403) | **Yes** |
| `/api/sewing/orders/:id` | `GET` | No | No (403) | No (403) | **Yes** |
| `/api/sewing/orders/:id/start` | `POST` | No | No (403) | No (403) | **Yes** |

---

### Detailed Endpoint Specifications

#### 1. `GET /api/health`
- **Auth:** Public
- **Description:** Verifies service liveness and database connectivity.
- **Response `200`:**
  ```json
  {
    "data": {
      "status": "healthy",
      "db": "ok",
      "timestamp": "2026-10-05T12:00:00.000Z"
    }
  }
  ```

---

#### 2. `POST /api/auth/login`
- **Auth:** Public
- **Description:** Authenticates user via email and password, setting an `HttpOnly`, `Secure`, `SameSite=Lax` cookie `af_session`.
- **Request:**
  ```json
  {
    "email": "verifier@apparelflow.demo",
    "password": "Verifier@123"
  }
  ```
- **Response `200`:**
  ```json
  {
    "data": {
      "user": {
        "id": "c1f7b8d0-...",
        "email": "verifier@apparelflow.demo",
        "fullName": "Kasun Fernando",
        "role": "cutting_verifier"
      }
    }
  }
  ```
- **Errors:** `400` Malformed payload · `401` "Invalid email or password" (constant timing) · `429` Rate limit exceeded.

---

#### 3. `POST /api/auth/logout`
- **Auth:** Any authenticated role
- **Description:** Clears the `af_session` session cookie.
- **Response `200`:**
  ```json
  {
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```

---

#### 4. `GET /api/auth/me`
- **Auth:** Any authenticated role
- **Description:** Returns the authenticated user session profile. Role is read fresh from DB.
- **Response `200`:**
  ```json
  {
    "data": {
      "id": "c1f7b8d0-...",
      "email": "verifier@apparelflow.demo",
      "fullName": "Kasun Fernando",
      "role": "cutting_verifier"
    }
  }
  ```
- **Errors:** `401 UNAUTHENTICATED`

---

#### 5. `GET /api/recipes`
- **Auth:** `cutting_supervisor`, `cutting_verifier`
- **Description:** Lists all available garment recipes including their component BOM specifications.
- **Response `200`:**
  ```json
  {
    "data": {
      "recipes": [
        {
          "id": "uuid",
          "recipeCode": "REC-BL01",
          "name": "Casual Blouse",
          "category": "Tops",
          "stdFabricYards": 1.8,
          "wastageCap": 5.0,
          "components": [
            {
              "id": "uuid",
              "componentName": "Front Body Panel",
              "piecesPerGarment": 1,
              "imageUrl": "/components/blouse-front.svg"
            },
            {
              "id": "uuid",
              "componentName": "Sleeve Cuffs",
              "piecesPerGarment": 2,
              "imageUrl": "/components/blouse-cuffs.svg"
            }
          ]
        }
      ]
    }
  }
  ```

---

#### 6. `POST /api/orders`
- **Auth:** `cutting_supervisor`
- **Description:** Creates a new cutting batch in `CUTTING_IN_PROGRESS` status. Dynamically derives component expected counts using the multiplier engine.
- **Request:**
  ```json
  {
    "recipeId": "uuid",
    "targetQty": 50,
    "fabricRollId": "FAB-ROLL-882",
    "actualFabricYds": 94.5
  }
  ```
- **Validation Rules:**
  - `targetQty`: Integer, `1 <= targetQty <= 100000` (rejects floats, strings, negatives).
  - `fabricRollId`: String matching `^[A-Z0-9-]{3,40}$`.
  - `actualFabricYds`: Number, positive, at most 2 decimal places.
  - `.strict()`: Rejects any unrecognized fields (`status`, `orderNo`, `createdBy`).
- **Response `201`:**
  ```json
  {
    "data": {
      "id": "uuid",
      "orderNo": "CUT-000001",
      "status": "CUTTING_IN_PROGRESS",
      "targetQty": 50,
      "fabricRollId": "FAB-ROLL-882",
      "actualFabricYds": 94.5,
      "expectedFabricYds": 90.0,
      "wastagePct": 5.0,
      "items": [
        {
          "componentId": "uuid",
          "componentName": "Front Body Panel",
          "piecesPerGarment": 1,
          "expectedQty": 50,
          "actualQty": null,
          "status": null
        },
        {
          "componentId": "uuid",
          "componentName": "Sleeve Cuffs",
          "piecesPerGarment": 2,
          "expectedQty": 100,
          "actualQty": null,
          "status": null
        }
      ]
    }
  }
  ```

---

#### 7. `GET /api/orders`
- **Auth:** `cutting_supervisor`
- **Query Params:** `status` (`CUTTING_IN_PROGRESS` | `PENDING_VERIFICATION` | `REJECTED` | `VERIFIED`), `page`, `pageSize`.
- **Response `200`:** Paginated orders list with expected components, fabric calculations, and audit history.

---

#### 8. `PATCH /api/orders/:id`
- **Auth:** `cutting_supervisor`
- **Description:** Updates `targetQty`, `fabricRollId`, or `actualFabricYds`. Permitted **only** when `status = CUTTING_IN_PROGRESS`. If `targetQty` is modified, expected component quantities are recalculated transactionally.
- **Errors:** `409 INVALID_STATE_TRANSITION` if order is already submitted or decided.

---

#### 9. `POST /api/orders/:id/submit`
- **Auth:** `cutting_supervisor`
- **Description:** Submits order for gatekeeper verification: transitions `CUTTING_IN_PROGRESS` $\rightarrow$ `PENDING_VERIFICATION` and sets `submittedAt`.
- **Errors:** `409 INVALID_STATE_TRANSITION` if not in progress.

---

#### 10. `POST /api/orders/:id/recut`
- **Auth:** `cutting_supervisor`
- **Description:** Resets a `REJECTED` batch back to `CUTTING_IN_PROGRESS` for re-cutting. Clears physical count inputs while preserving past rejection audit logs.
- **Errors:** `409 INVALID_STATE_TRANSITION` if order is not `REJECTED`.

---

#### 11. `GET /api/verification/queue`
- **Auth:** `cutting_verifier`
- **Description:** Returns all batches currently in `PENDING_VERIFICATION` status awaiting component counts.

---

#### 12. `GET /api/verification/orders/:id`
- **Auth:** `cutting_verifier`
- **Description:** Loads full Verification Terminal state: order metadata, recipe details, component expected vs actual counts, live traffic light statuses, and server-side `canApprove` gate readiness.

---

#### 13. `PUT /api/verification/orders/:id/counts`
- **Auth:** `cutting_verifier`
- **Description:** Saves physical counts entered by the verifier. Computes `GREEN`, `YELLOW`, `RED` status on the server.
- **Request:**
  ```json
  {
    "counts": [
      { "componentId": "uuid-1", "actualQty": 50 },
      { "componentId": "uuid-2", "actualQty": 100 }
    ]
  }
  ```
- **Validation Rules:** `actualQty` non-negative integer. Client cannot send or dictate `status`. Order must be `PENDING_VERIFICATION`.

---

#### 14. `POST /api/verification/orders/:id/approve` (GATEKEEPER HARD STOP)
- **Auth:** `cutting_verifier`
- **Description:** Verifies and approves a batch to enter the Sewing Queue.
- **Guards (Zero Tolerance):**
  - **No body accepted.** The server loads all persisted items from the database.
  - If any component has `actualQty IS NULL` $\rightarrow$ `422 Unprocessable Entity` (`GATE_UNCOUNTED`).
  - If any component has `actualQty < expectedQty` $\rightarrow$ `422 Unprocessable Entity` (`GATE_SHORTAGE`).
  - Database trigger `trg_approval_gate` blocks any attempt to insert an `APPROVED` log if shortage or uncounted items exist.
  - If all components match or exceed: writes immutable audit log with session verifier ID, calculates `wastagePct`, creates `varianceSnapshot`, conditionally updates order status to `VERIFIED`.
- **Response `200`:**
  ```json
  {
    "data": {
      "orderId": "uuid",
      "status": "VERIFIED",
      "verifiedAt": "2026-10-05T12:30:00.000Z",
      "audit": {
        "verifierId": "uuid",
        "verifierName": "Kasun Fernando",
        "wastagePct": 5.0,
        "variances": [ ... ]
      }
    }
  }
  ```
- **Errors:**
  ```json
  {
    "error": {
      "code": "GATE_SHORTAGE",
      "message": "Approval blocked: 1 component has a shortage.",
      "details": {
        "blockers": ["Sleeve Cuffs: short by 2"]
      }
    }
  }
  ```

---

#### 15. `POST /api/verification/orders/:id/reject`
- **Auth:** `cutting_verifier`
- **Description:** Rejects a defective or short batch, returning it to the supervisor for re-cutting.
- **Request:**
  ```json
  {
    "note": "Sleeve cuffs have fabric flaw; short 2 pieces. Recut required."
  }
  ```
- **Validation Rules:** `note` is required, trimmed length 5 to 500 characters. Order transitions to `REJECTED`. An immutable `REJECTED` audit log is created.

---

#### 16. `GET /api/sewing/queue`
- **Auth:** `sewing_supervisor`
- **Description:** Lists batches available on the sewing floor.
- **Security Constraint:** Literal database query hardcoded to `status: 'VERIFIED'`. Parameter tampering (`?status=PENDING_VERIFICATION`) is discarded. Non-verified batches can never be viewed.
- **Query Params:** `startedFilter` (`all` | `awaiting` | `started`), `page`, `pageSize`.

---

#### 17. `GET /api/sewing/orders/:id`
- **Auth:** `sewing_supervisor`
- **Description:** Returns verified batch specifications and immutable audit stub for sewing line setup.
- **Security Constraint:** Queries `{ id, status: 'VERIFIED' }`. Any non-verified order returns `404 Not Found` (preventing information disclosure).

---

#### 18. `POST /api/sewing/orders/:id/start`
- **Auth:** `sewing_supervisor`
- **Description:** Begins assembly of a verified batch on the sewing line.
- **Guards:** Conditional update `where: { id, status: 'VERIFIED', sewingStartedAt: null }`. Sets `sewingStartedAt = now()`, `sewingStartedBy = session user`.
- **Response `200`:** Sets start timestamp. Order status remains `VERIFIED` (design decision D-02).
- **Errors:** `409 INVALID_STATE_TRANSITION` if assembly was already started. `404 NOT_FOUND` if order is not verified.
