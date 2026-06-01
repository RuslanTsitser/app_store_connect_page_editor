export interface AscCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

export interface AscResource<T extends string, A> {
  id: string;
  type: T;
  attributes: A;
  relationships?: Record<string, unknown>;
}

export interface AscListResponse<T extends string, A> {
  data: AscResource<T, A>[];
  links?: { next?: string };
}

export interface AscSingleResponse<T extends string, A> {
  data: AscResource<T, A>;
}

export interface AppAttributes {
  name: string;
  bundleId: string;
  sku: string;
  primaryLocale?: string;
}

export interface AppStoreVersionAttributes {
  versionString: string;
  appStoreState: string;
  platform?: string;
}

export interface VersionLocalizationAttributes {
  locale: string;
  description?: string | null;
  keywords?: string | null;
  whatsNew?: string | null;
  promotionalText?: string | null;
  marketingUrl?: string | null;
  supportUrl?: string | null;
}

export interface AppInfoLocalizationAttributes {
  locale: string;
  name?: string | null;
  subtitle?: string | null;
  privacyPolicyUrl?: string | null;
  privacyPolicyText?: string | null;
}

export interface ScreenshotAttributes {
  fileSize: number;
  fileName: string;
  assetDeliveryState?: { state?: string };
  imageAsset?: {
    width?: number;
    height?: number;
    templateUrl?: string;
  };
}

export type VersionLocalization = AscResource<
  "appStoreVersionLocalizations",
  VersionLocalizationAttributes
>;

export type AppInfoLocalization = AscResource<
  "appInfoLocalizations",
  AppInfoLocalizationAttributes
>;

export const VERSION_TEXT_FIELDS = [
  { key: "description", label: "Description", multiline: true },
  { key: "keywords", label: "Keywords", multiline: false },
  { key: "whatsNew", label: "What's New", multiline: true },
  { key: "promotionalText", label: "Promotional Text", multiline: true },
  { key: "marketingUrl", label: "Marketing URL", multiline: false },
  { key: "supportUrl", label: "Support URL", multiline: false },
] as const;

export const APP_INFO_TEXT_FIELDS = [
  { key: "name", label: "Name", multiline: false },
  { key: "subtitle", label: "Subtitle", multiline: false },
  { key: "privacyPolicyUrl", label: "Privacy Policy URL", multiline: false },
  { key: "privacyPolicyText", label: "Privacy Policy Text", multiline: true },
] as const;

export type VersionFieldKey = (typeof VERSION_TEXT_FIELDS)[number]["key"];
export type AppInfoFieldKey = (typeof APP_INFO_TEXT_FIELDS)[number]["key"];
