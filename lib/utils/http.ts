
import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/api";
import { AppError } from "./errors";

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof AppError) {
    return NextResponse.json<ApiErrorBody>(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Beklenmeyen hata:", error);
  return NextResponse.json<ApiErrorBody>(
    {
      error: {
        code: "SERVER_ERROR",
        message: "Sunucuda bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.",
      },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}


