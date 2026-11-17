
import type { ApiErrorBody } from "@/types/api";

export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

export const NETWORK_ERROR_MESSAGE =
  "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.";

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const inner = (value as { error: unknown }).error;
  return (
    typeof inner === "object" &&
    inner !== null &&
    "message" in inner &&
    typeof (inner as { message: unknown }).message === "string"
  );
}

export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isApiErrorBody(body)) {
      return body.error.message;
    }
  } catch {
    // Gövde JSON değil; aşağıdaki genel mesaja düşülür.
  }

  if (response.status === 413) {
    return "Dosya sunucu için çok büyük. Daha küçük bir dosya deneyin.";
  }
  return fallback;
}


