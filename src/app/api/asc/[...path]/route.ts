import { NextRequest, NextResponse } from "next/server";
import { parseCredentialsFromRequest } from "@/lib/asc/credentials-from-request";
import { ascServerFetch } from "@/lib/asc/server-client";

export const maxDuration = 30;
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const credentials = parseCredentialsFromRequest(request);
  if (!credentials) {
    return NextResponse.json(
      {
        errors: [
          {
            title: "Unauthorized",
            detail:
              "Укажите Issuer ID, Key ID и приватный ключ (.p8) в настройках API",
          },
        ],
      },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const ascPath = path.join("/");
  const search = request.nextUrl.search;

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  const upstream = await ascServerFetch(credentials, `${ascPath}${search}`, {
    method: request.method,
    body: body || undefined,
  });

  const responseText = await upstream.text();
  return new NextResponse(responseText || null, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
