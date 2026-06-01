import type { AscCredentials } from "./asc/types";
import { ASC_CREDENTIAL_HEADERS } from "./asc/credentials-from-request";

const STORAGE_KEY = "asc-page-editor-credentials";

export function loadCredentials(): AscCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AscCredentials;
    if (!parsed.issuerId || !parsed.keyId || !parsed.privateKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: AscCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function credentialsToHeaders(
  credentials: AscCredentials,
): Record<string, string> {
  return {
    [ASC_CREDENTIAL_HEADERS.issuer]: credentials.issuerId,
    [ASC_CREDENTIAL_HEADERS.keyId]: credentials.keyId,
    [ASC_CREDENTIAL_HEADERS.privateKey]: Buffer.from(
      credentials.privateKey,
      "utf8",
    ).toString("base64"),
  };
}

/** Browser-safe base64 for private key in headers */
export function credentialsToHeadersBrowser(
  credentials: AscCredentials,
): Record<string, string> {
  const bytes = new TextEncoder().encode(credentials.privateKey);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return {
    [ASC_CREDENTIAL_HEADERS.issuer]: credentials.issuerId,
    [ASC_CREDENTIAL_HEADERS.keyId]: credentials.keyId,
    [ASC_CREDENTIAL_HEADERS.privateKey]: btoa(binary),
  };
}
