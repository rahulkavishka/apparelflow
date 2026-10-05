import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function jsonOk<T>(data: T, status = 200, init?: ResponseInit) {
  return NextResponse.json({ data }, { status, ...init });
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors;
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: { fieldErrors, issues: err.issues },
        },
      },
      { status: 400 }
    );
  }

  // Handle PostgreSQL / Prisma trigger and constraint errors
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("approval gate: shortage or uncounted component") || message.includes("23514")) {
    return NextResponse.json(
      {
        error: {
          code: "GATE_SHORTAGE",
          message: "Server gatekeeper rejected approval: component shortage or uncounted items detected.",
        },
      },
      { status: 422 }
    );
  }

  if (message.includes("append-only") || message.includes("immutable")) {
    return NextResponse.json(
      {
        error: {
          code: "IMMUTABLE_RECORD",
          message: "This record is immutable and cannot be updated or deleted.",
        },
      },
      { status: 409 }
    );
  }

  console.error("[Unhandled Exception]", err);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL",
        message: "An internal server error occurred",
      },
    },
    { status: 500 }
  );
}
