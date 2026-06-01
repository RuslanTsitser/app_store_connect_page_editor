"use client";

import { useCallback, useState } from "react";
import { ascApi } from "@/lib/asc-client";
import type {
  AppAttributes,
  AppInfoLocalization,
  AppStoreVersionAttributes,
  AscListResponse,
  AscResource,
  VersionLocalization,
} from "@/lib/asc/types";

export function useAscData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApps = useCallback(
    () =>
      run(() =>
        ascApi<AscListResponse<"apps", AppAttributes>>(
          "/apps?limit=200&fields[apps]=name,bundleId,sku,primaryLocale",
        ),
      ),
    [run],
  );

  const fetchVersions = useCallback(
    (appId: string) =>
      run(() =>
        ascApi<AscListResponse<"appStoreVersions", AppStoreVersionAttributes>>(
          `/apps/${appId}/appStoreVersions?limit=50&fields[appStoreVersions]=versionString,appStoreState,platform`,
        ),
      ),
    [run],
  );

  const fetchVersionLocalizations = useCallback(
    (versionId: string) =>
      run(() =>
        ascApi<AscListResponse<"appStoreVersionLocalizations", VersionLocalization["attributes"]>>(
          `/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=200`,
        ),
      ),
    [run],
  );

  const fetchAppInfoLocalizations = useCallback(
    (appId: string) =>
      run(() =>
        ascApi<AscListResponse<"appInfoLocalizations", AppInfoLocalization["attributes"]>>(
          `/apps/${appId}/appInfos?limit=1`,
        ).then(async (appInfos) => {
          const appInfoId = appInfos?.data?.[0]?.id;
          if (!appInfoId) return { data: [] as AppInfoLocalization[] };
          return ascApi<AscListResponse<"appInfoLocalizations", AppInfoLocalization["attributes"]>>(
            `/appInfos/${appInfoId}/appInfoLocalizations?limit=200`,
          );
        }),
      ),
    [run],
  );

  const patchVersionLocalization = useCallback(
    (id: string, attributes: Record<string, string | null>) =>
      run(() =>
        ascApi(`/appStoreVersionLocalizations/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            data: {
              type: "appStoreVersionLocalizations",
              id,
              attributes,
            },
          }),
        }),
      ),
    [run],
  );

  const patchAppInfoLocalization = useCallback(
    (id: string, attributes: Record<string, string | null>) =>
      run(() =>
        ascApi(`/appInfoLocalizations/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            data: {
              type: "appInfoLocalizations",
              id,
              attributes,
            },
          }),
        }),
      ),
    [run],
  );

  return {
    loading,
    error,
    setError,
    fetchApps,
    fetchVersions,
    fetchVersionLocalizations,
    fetchAppInfoLocalizations,
    patchVersionLocalization,
    patchAppInfoLocalization,
  };
}

export type AppItem = AscResource<"apps", AppAttributes>;
export type VersionItem = AscResource<"appStoreVersions", AppStoreVersionAttributes>;
