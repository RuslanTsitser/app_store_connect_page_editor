import { AscApiError, ascApi } from "./asc-client";
import {
  credentialsToHeadersBrowser,
  loadCredentials,
} from "./credentials-storage";
import {
  matchesScreenshotSize,
  readImageDimensions,
  sizeHintForDisplayType,
} from "./asc/screenshot-sizes";

const MAX_SCREENSHOTS_PER_SET = 10;

export async function deleteScreenshot(screenshotId: string): Promise<void> {
  await ascApi(`/appScreenshots/${screenshotId}`, { method: "DELETE" });
}

export async function reorderScreenshots(
  setId: string,
  orderedIds: string[],
): Promise<void> {
  await ascApi(`/appScreenshotSets/${setId}/relationships/appScreenshots`, {
    method: "PATCH",
    body: JSON.stringify({
      data: orderedIds.map((id) => ({
        type: "appScreenshots",
        id,
      })),
    }),
  });
}

export async function createScreenshotSet(
  localizationId: string,
  displayType: string,
): Promise<{ id: string; displayType: string }> {
  const res = await ascApi<{
    data?: { id: string; attributes?: { screenshotDisplayType?: string } };
  }>("/appScreenshotSets", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "appScreenshotSets",
        attributes: { screenshotDisplayType: displayType },
        relationships: {
          appStoreVersionLocalization: {
            data: {
              type: "appStoreVersionLocalizations",
              id: localizationId,
            },
          },
        },
      },
    }),
  });

  const id = res.data?.id;
  if (!id) throw new AscApiError("Не удалось создать набор скриншотов", 500);

  return {
    id,
    displayType:
      String(res.data?.attributes?.screenshotDisplayType ?? displayType),
  };
}

export type UploadScreenshotResult = { id: string };

export async function validateScreenshotFile(
  file: File,
  displayType: string,
): Promise<void> {
  if (!file.type.match(/^image\/(png|jpeg|jpg)$/i) && !file.name.match(/\.(png|jpe?g)$/i)) {
    throw new Error("Допустимы только PNG и JPEG");
  }

  const { width, height } = await readImageDimensions(file);
  if (!matchesScreenshotSize(width, height, displayType)) {
    throw new Error(
      `Размер ${width}×${height} не подходит для этого слота. Ожидается: ${sizeHintForDisplayType(displayType)}`,
    );
  }
}

export async function uploadScreenshotFile(
  setId: string,
  file: File,
  displayType: string,
  currentCount: number,
): Promise<UploadScreenshotResult> {
  if (currentCount >= MAX_SCREENSHOTS_PER_SET) {
    throw new Error(`Не больше ${MAX_SCREENSHOTS_PER_SET} скриншотов в одном наборе`);
  }

  await validateScreenshotFile(file, displayType);

  const credentials = loadCredentials();
  if (!credentials) {
    throw new AscApiError("Сначала укажите API ключ App Store Connect", 401);
  }

  const form = new FormData();
  form.append("setId", setId);
  form.append("file", file, file.name);

  const response = await fetch("/api/asc/screenshot-upload", {
    method: "POST",
    headers: credentialsToHeadersBrowser(credentials),
    body: form,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const err = data as { error?: string; errors?: { detail?: string }[] };
    const detail =
      err?.error ??
      err?.errors?.[0]?.detail ??
      `HTTP ${response.status}`;
    throw new AscApiError(detail, response.status, data);
  }

  const ok = data as { id?: string };
  if (!ok.id) {
    throw new AscApiError("Загрузка завершилась без id", 500, data);
  }

  return { id: ok.id };
}
