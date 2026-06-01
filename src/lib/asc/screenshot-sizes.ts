/** Допустимые размеры (портрет или ландшафт) по типу слота ASC. */
export const SCREENSHOT_SIZE_SPECS: Record<
  string,
  { width: number; height: number; label: string }[]
> = {
  APP_IPHONE_69: [
    { width: 1320, height: 2868, label: "1320×2868" },
    { width: 1290, height: 2796, label: "1290×2796" },
  ],
  APP_IPHONE_67: [
    { width: 1290, height: 2796, label: "1290×2796" },
    { width: 1320, height: 2868, label: "1320×2868 (6.9\" asset)" },
  ],
  APP_IPHONE_65: [
    { width: 1284, height: 2778, label: "1284×2778" },
    { width: 1260, height: 2736, label: "1260×2736 (Air)" },
  ],
  APP_IPHONE_61: [{ width: 1179, height: 2556, label: "1179×2556" }],
  APP_IPHONE_58: [{ width: 1170, height: 2532, label: "1170×2532" }],
  APP_IPHONE_55: [{ width: 1242, height: 2208, label: "1242×2208" }],
  APP_IPAD_PRO_3GEN_129: [
    { width: 2064, height: 2752, label: "2064×2752" },
    { width: 2048, height: 2732, label: "2048×2732" },
  ],
  APP_IPAD_PRO_129: [{ width: 2048, height: 2732, label: "2048×2732" }],
  APP_IPAD_PRO_3GEN_11: [{ width: 1668, height: 2388, label: "1668×2388" }],
  APP_IPAD_105: [{ width: 1668, height: 2224, label: "1668×2224" }],
  APP_IPAD_97: [{ width: 1536, height: 2048, label: "1536×2048" }],
  APP_APPLE_VISION_PRO: [
    { width: 3840, height: 2160, label: "3840×2160" },
  ],
  APP_DESKTOP: [
    { width: 1280, height: 800, label: "1280×800" },
    { width: 1440, height: 900, label: "1440×900" },
    { width: 2560, height: 1600, label: "2560×1600" },
    { width: 2880, height: 1800, label: "2880×1800" },
  ],
};

export function sizeHintForDisplayType(displayType: string): string {
  const specs = SCREENSHOT_SIZE_SPECS[displayType];
  if (!specs?.length) return "PNG или JPEG, точные размеры по спецификации Apple";
  return specs.map((s) => s.label).join(" или ");
}

export function matchesScreenshotSize(
  width: number,
  height: number,
  displayType: string,
): boolean {
  const specs = SCREENSHOT_SIZE_SPECS[displayType];
  if (!specs?.length) return true;
  return specs.some(
    (s) =>
      (width === s.width && height === s.height) ||
      (width === s.height && height === s.width),
  );
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать изображение"));
    };
    img.src = url;
  });
}
