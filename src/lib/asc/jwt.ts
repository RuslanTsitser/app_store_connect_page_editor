import { SignJWT, importPKCS8 } from "jose";

const AUDIENCE = "appstoreconnect-v1";

function normalizePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("BEGIN PRIVATE KEY")) {
    return trimmed;
  }
  const body = trimmed.replace(/\s/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----`;
}

export async function createAscJwt(
  issuerId: string,
  keyId: string,
  privateKeyPem: string,
): Promise<string> {
  const pem = normalizePrivateKey(privateKeyPem);
  const key = await importPKCS8(pem, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 19 * 60)
    .sign(key);
}
