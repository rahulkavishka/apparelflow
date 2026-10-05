export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation error", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Invalid email or password") {
    super(401, "UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden: You do not have permission to perform this action") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(code = "INVALID_STATE_TRANSITION", message = "Operation cannot be completed in current state") {
    super(409, code, message);
  }
}

export class GateError extends AppError {
  constructor(
    code: "GATE_SHORTAGE" | "GATE_UNCOUNTED",
    message: string,
    details?: unknown
  ) {
    super(422, code, message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(429, "RATE_LIMITED", message);
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(500, "INTERNAL", message);
  }
}
