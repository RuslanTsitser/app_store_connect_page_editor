import type { AscCredentials } from "./types";

const ISSUER_HEADER = "x-asc-issuer-id";
const KEY_ID_HEADER = "x-asc-key-id";
const PRIVATE_KEY_HEADER = "x-asc-private-key";

export function parseCredentialsFromRequest(
  request: Request,
): AscCredentials | null {
  const issuerId = request.headers.get(ISSUER_HEADER)?.trim();
  const keyId = request.headers.get(KEY_ID_HEADER)?.trim();
  const privateKeyEncoded = request.headers.get(PRIVATE_KEY_HEADER)?.trim();

  if (!issuerId || !keyId || !privateKeyEncoded) {
    return null;
  }

  let privateKey: string;
  try {
    privateKey = Buffer.from(privateKeyEncoded, "base64").toString("utf8");
  } catch {
    return null;
  }

  if (!privateKey) {
    return null;
  }

  return { issuerId, keyId, privateKey };
}

export const ASC_CREDENTIAL_HEADERS = {
  issuer: ISSUER_HEADER,
  keyId: KEY_ID_HEADER,
  privateKey: PRIVATE_KEY_HEADER,
} as const;
