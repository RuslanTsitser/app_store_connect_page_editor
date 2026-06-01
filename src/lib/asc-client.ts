import {
  credentialsToHeadersBrowser,
  loadCredentials,
} from "./credentials-storage";

export class AscApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "AscApiError";
  }
}

export async function ascApi<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new AscApiError("Add your App Store Connect API key first", 401);
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `/api/asc${normalized}${init?.method === undefined && !normalized.includes("?") ? "" : ""}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...credentialsToHeadersBrowser(credentials),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const err = data as { errors?: { detail?: string; title?: string }[] };
    const detail =
      err?.errors?.[0]?.detail ??
      err?.errors?.[0]?.title ??
      `HTTP ${response.status}`;
    throw new AscApiError(detail, response.status, data);
  }

  return data as T;
}
