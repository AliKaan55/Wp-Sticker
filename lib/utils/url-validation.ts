
import { URL_MAX_LENGTH } from "@/lib/constants";
import type { ApiErrorCode } from "@/types/api";

export type UrlValidationResult =
  | { readonly ok: true; readonly url: URL }
  | { readonly ok: false; readonly code: ApiErrorCode; readonly message: string };

const BLOCKED_HOST_SUFFIXES: readonly string[] = [
  ".localhost",
  ".local",
  ".internal",
  ".localdomain",
  ".home.arpa",
  ".lan",
  ".intranet",
];

export const BLOCKED_HOST_MESSAGE =
  "Bu adrese erişime izin verilmiyor. Herkese açık bir bağlantı kullanın.";

export function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = stripIpv6Brackets(hostname).toLowerCase().replace(/\.$/, "");

  if (host === "" || host === "localhost") {
    return true;
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return true;
  }

  const isIpv6Literal = host.includes(":");
  if (!isIpv6Literal && !host.includes(".")) {
    return true;
  }

  return false;
}

export function parseImportUrl(raw: string): UrlValidationResult {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return { ok: false, code: "INVALID_URL", message: "Lütfen bir bağlantı yapıştırın." };
  }

  if (trimmed.length > URL_MAX_LENGTH) {
    return { ok: false, code: "INVALID_URL", message: "Bağlantı çok uzun." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Geçersiz bağlantı. https:// ile başlayan tam bir adres girin.",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Yalnızca http:// ve https:// bağlantıları desteklenir.",
    };
  }

  if (url.username !== "" || url.password !== "") {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Kullanıcı adı veya şifre içeren bağlantılar desteklenmez.",
    };
  }

  if (isBlockedHostname(url.hostname)) {
    return { ok: false, code: "BLOCKED_HOST", message: BLOCKED_HOST_MESSAGE };
  }

  return { ok: true, url };
}


