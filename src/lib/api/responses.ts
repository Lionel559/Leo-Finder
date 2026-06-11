import { NextResponse } from "next/server";

import type { ApiResponse, ValidationErrors } from "@/types";

type ApiResponseInit = {
  status?: number;
  headers?: HeadersInit;
};

export function successResponse<TData = undefined>(
  message = "Success",
  data?: TData,
  init: ApiResponseInit = {},
) {
  const body: ApiResponse<TData> = {
    success: true,
    message,
  };

  if (data !== undefined) {
    body.data = data;
  }

  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

export function errorResponse(
  message = "Something went wrong",
  status = 500,
  error?: { code?: string; details?: unknown },
  headers?: HeadersInit,
) {
  const body: ApiResponse<never> = {
    success: false,
    message,
  };

  if (error) {
    body.error = error;
  }

  return NextResponse.json(body, { status, headers });
}

export function validationErrorResponse(
  errors: ValidationErrors,
  message = "Validation failed",
  headers?: HeadersInit,
) {
  const body: ApiResponse<never> = {
    success: false,
    message,
    errors,
  };

  return NextResponse.json(body, { status: 422, headers });
}
