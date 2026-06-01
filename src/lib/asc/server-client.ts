import type { AscCredentials } from "./types";
import { createAscJwt } from "./jwt";

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";

export async function ascServerFetch(
  credentials: AscCredentials,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await createAscJwt(
    credentials.issuerId,
    credentials.keyId,
    credentials.privateKey,
  );

  const url = path.startsWith("http") ? path : `${BASE_URL}/${path.replace(/^\//, "")}`;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
