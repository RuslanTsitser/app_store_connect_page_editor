import { ascApi, AscApiError } from "./asc-client";
import type { ScreenshotAttributes } from "./asc/types";

export interface ScreenshotItem {
  id: string;
  url: string;
  fileName: string;
  deliveryState?: string;
}

type JsonApiResource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<
    string,
    {
      data?:
        | { id: string; type: string }
        | { id: string; type: string }[]
        | null;
    }
  >;
};

type ScreenshotSetsResponse = {
  data?: JsonApiResource[];
  included?: JsonApiResource[];
};

const SETS_PATH_FIELDS =
  "include=appScreenshots&limit=200" +
  "&fields[appScreenshotSets]=screenshotDisplayType" +
  "&fields[appScreenshots]=fileName,imageAsset,assetDeliveryState";

/** Приоритет при авто-выборе размера (6.9\" — актуальный обязательный слот). */
export const DISPLAY_TYPE_PRIORITY = [
  "APP_IPHONE_69",
  "APP_IPHONE_67",
  "APP_IPHONE_65",
  "APP_IPHONE_61",
  "APP_IPHONE_58",
  "APP_IPHONE_55",
  "APP_IPAD_PRO_3GEN_129",
  "APP_IPAD_PRO_129",
  "APP_IPAD_PRO_3GEN_11",
  "APP_IPAD_105",
  "APP_IPAD_97",
] as const;

export const DISPLAY_TYPE_LABELS: Record<string, string> = {
  APP_IPHONE_69: 'iPhone 6.9"',
  APP_IPHONE_67: 'iPhone 6.7"',
  APP_IPHONE_65: 'iPhone 6.5"',
  APP_IPHONE_61: 'iPhone 6.1"',
  APP_IPHONE_58: 'iPhone 5.8"',
  APP_IPHONE_55: 'iPhone 5.5"',
  APP_IPAD_PRO_129: 'iPad Pro 12.9"',
  APP_IPAD_PRO_3GEN_129: 'iPad Pro 12.9" (3rd gen)',
  APP_IPAD_PRO_3GEN_11: 'iPad Pro 11"',
  APP_IPAD_105: 'iPad 10.5"',
  APP_IPAD_97: 'iPad 9.7"',
  APP_APPLE_VISION_PRO: "Apple Vision Pro",
  APP_DESKTOP: "Mac",
};

export function displayTypeLabel(type: string): string {
  return DISPLAY_TYPE_LABELS[type] ?? type;
}

function buildImageUrl(attrs: ScreenshotAttributes): string | null {
  const asset = attrs.imageAsset;
  const tpl = asset?.templateUrl;
  if (!tpl) return null;

  const w = asset?.width ?? 300;
  const h = asset?.height ?? 650;

  return tpl
    .replace(/\{w\}/g, String(w))
    .replace(/\{h\}/g, String(h))
    .replace(/\{f\}/g, "png")
    .replace(/\{c\}/g, "bb");
}

function isRenderableScreenshot(attrs: ScreenshotAttributes): boolean {
  const state = attrs.assetDeliveryState?.state;
  if (!state) return true;
  return (
    state === "COMPLETE" ||
    state === "UPLOAD_COMPLETE" ||
    state === "SUCCESS"
  );
}

function toScreenshotItem(r: JsonApiResource): ScreenshotItem {
  const attrs = r.attributes as unknown as ScreenshotAttributes;
  if (!isRenderableScreenshot(attrs)) {
    return {
      id: r.id,
      fileName: attrs.fileName ?? r.id,
      url: "",
      deliveryState: attrs.assetDeliveryState?.state ?? "PENDING",
    };
  }

  return {
    id: r.id,
    fileName: attrs.fileName ?? r.id,
    url: buildImageUrl(attrs) ?? "",
    deliveryState: attrs.assetDeliveryState?.state,
  };
}

function screenshotsForSet(
  set: JsonApiResource,
  included: JsonApiResource[],
): ScreenshotItem[] {
  const bySetId = new Map<string, JsonApiResource[]>();

  for (const r of included) {
    if (r.type !== "appScreenshots") continue;
    const rel = r.relationships?.appScreenshotSet?.data;
    const setRef = Array.isArray(rel) ? rel[0] : rel;
    if (!setRef?.id) continue;
    const list = bySetId.get(setRef.id) ?? [];
    list.push(r);
    bySetId.set(setRef.id, list);
  }

  const fromIncluded = bySetId.get(set.id) ?? [];

  const rel = set.relationships?.appScreenshots?.data;
  const refs = Array.isArray(rel) ? rel : rel ? [rel] : [];
  const byId = new Map(included.map((r) => [r.id, r]));

  const fromRefs = refs
    .map((ref) => byId.get(ref.id))
    .filter((r): r is JsonApiResource => !!r);

  const merged = fromIncluded.length > 0 ? fromIncluded : fromRefs;

  return merged.map(toScreenshotItem);
}

function pickScreenshotSet(
  sets: JsonApiResource[],
  displayType: string,
): JsonApiResource | undefined {
  const direct = sets.find(
    (s) => s.attributes.screenshotDisplayType === displayType,
  );
  if (direct) return direct;

  for (const preferred of DISPLAY_TYPE_PRIORITY) {
    const found = sets.find(
      (s) => s.attributes.screenshotDisplayType === preferred,
    );
    if (found) return found;
  }

  return sets[0];
}

export type LocalizationScreenshotResult = {
  shots: ScreenshotItem[];
  availableDisplayTypes: string[];
  usedDisplayType: string | null;
  hasSets: boolean;
  error?: string;
};

export async function fetchScreenshotsForLocalization(
  localizationId: string,
  displayType: string,
): Promise<LocalizationScreenshotResult> {
  try {
    const res = await ascApi<ScreenshotSetsResponse>(
      `/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?${SETS_PATH_FIELDS}`,
    );

    const sets = res.data ?? [];
    const availableDisplayTypes = sets
      .map((s) => String(s.attributes.screenshotDisplayType ?? ""))
      .filter(Boolean);

    if (sets.length === 0) {
      return {
        shots: [],
        availableDisplayTypes: [],
        usedDisplayType: null,
        hasSets: false,
      };
    }

    const set = pickScreenshotSet(sets, displayType);
    if (!set) {
      return {
        shots: [],
        availableDisplayTypes,
        usedDisplayType: null,
        hasSets: true,
      };
    }

    const usedDisplayType = String(set.attributes.screenshotDisplayType ?? "");
    let shots = screenshotsForSet(set, res.included ?? []);

    if (shots.length === 0) {
      const nested = await ascApi<{ data?: JsonApiResource[] }>(
        `/appScreenshotSets/${set.id}/appScreenshots?limit=20&fields[appScreenshots]=fileName,imageAsset,assetDeliveryState`,
      );
      shots = nested.data?.map(toScreenshotItem) ?? [];
    }

    return {
      shots,
      availableDisplayTypes,
      usedDisplayType,
      hasSets: true,
    };
  } catch (e) {
    const message =
      e instanceof AscApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Ошибка загрузки скриншотов";
    return {
      shots: [],
      availableDisplayTypes: [],
      usedDisplayType: null,
      hasSets: false,
      error: message,
    };
  }
}

export type FetchAllScreenshotsResult = {
  byLocale: Record<string, ScreenshotItem[]>;
  availableDisplayTypes: string[];
  usedDisplayType: string | null;
  hint?: string;
  errors: string[];
};

export async function fetchScreenshotsForAllLocales(
  localizations: { id: string; locale: string }[],
  displayType: string,
  concurrency = 4,
): Promise<FetchAllScreenshotsResult> {
  const byLocale: Record<string, ScreenshotItem[]> = {};
  const typeSet = new Set<string>();
  const errors: string[] = [];
  let anySets = false;
  let anyShots = false;
  let usedDisplayType: string | null = null;
  const queue = [...localizations];

  async function worker() {
    while (queue.length > 0) {
      const loc = queue.shift();
      if (!loc) break;

      const result = await fetchScreenshotsForLocalization(loc.id, displayType);
      byLocale[loc.locale] = result.shots;
      result.availableDisplayTypes.forEach((t) => typeSet.add(t));
      if (result.hasSets) anySets = true;
      if (result.shots.length > 0) anyShots = true;
      if (result.usedDisplayType && !usedDisplayType) {
        usedDisplayType = result.usedDisplayType;
      }
      if (result.error) {
        errors.push(`${loc.locale}: ${result.error}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, localizations.length) }, () =>
      worker(),
    ),
  );

  const availableDisplayTypes = [...typeSet].sort((a, b) => {
    const ai = DISPLAY_TYPE_PRIORITY.indexOf(
      a as (typeof DISPLAY_TYPE_PRIORITY)[number],
    );
    const bi = DISPLAY_TYPE_PRIORITY.indexOf(
      b as (typeof DISPLAY_TYPE_PRIORITY)[number],
    );
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    return ap - bp;
  });

  let hint: string | undefined;
  if (!anySets) {
    hint =
      "У этой версии в App Store Connect нет наборов скриншотов. Загрузите их в ASC для выбранной версии (Prepare for Submission).";
  } else if (!anyShots) {
    if (!availableDisplayTypes.includes(displayType)) {
      hint = `Для «${displayTypeLabel(displayType)}» нет набора. В ASC есть: ${availableDisplayTypes.map(displayTypeLabel).join(", ")}. Выберите другой тип устройства.`;
    } else {
      hint =
        "Набор для этого размера есть, но скриншоты пустые или ещё не завершили загрузку (нет imageAsset).";
    }
  } else if (usedDisplayType && usedDisplayType !== displayType) {
    hint = `Показаны скриншоты для «${displayTypeLabel(usedDisplayType)}» — для выбранного размера набора не найдено.`;
  }

  return {
    byLocale,
    availableDisplayTypes,
    usedDisplayType,
    hint,
    errors,
  };
}
