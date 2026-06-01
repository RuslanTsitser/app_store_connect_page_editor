import { NextRequest, NextResponse } from "next/server";
import { parseCredentialsFromRequest } from "@/lib/asc/credentials-from-request";
import { uploadScreenshotToSet } from "@/lib/asc/screenshot-upload-server";

/** Reserve → S3 → commit can take longer than the default 10s on Vercel. */
export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const credentials = parseCredentialsFromRequest(request);
  if (!credentials) {
    return NextResponse.json(
      { error: "Укажите API ключ App Store Connect" },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const setId = form.get("setId")?.toString().trim();
  const file = form.get("file");

  if (!setId) {
    return NextResponse.json({ error: "Не указан setId" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Не выбран файл" }, { status: 400 });
  }

  const fileName = file.name || "screenshot.png";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadScreenshotToSet(
      credentials,
      setId,
      fileName,
      buffer,
    );
    return NextResponse.json({ id: result.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка загрузки";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
