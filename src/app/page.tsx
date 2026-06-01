"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Layout,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import {
  ApiOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { CredentialsModal } from "@/components/CredentialsModal";
import { LocaleTabsEditor } from "@/components/LocaleTabsEditor";
import { ScreenshotsPanel } from "@/components/ScreenshotsPanel";
import { loadCredentials } from "@/lib/credentials-storage";
import {
  APP_INFO_TEXT_FIELDS,
  VERSION_TEXT_FIELDS,
  type AppInfoLocalization,
  type VersionLocalization,
} from "@/lib/asc/types";
import { useAscData, type AppItem, type VersionItem } from "@/hooks/use-asc-data";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

type DraftMap = Record<string, Record<string, string>>;

function buildDraftFromLocalizations(
  items: { id: string; attributes: object }[],
  fieldKeys: readonly string[],
): DraftMap {
  const draft: DraftMap = {};
  for (const item of items) {
    draft[item.id] = {};
    const attrs = item.attributes as Record<string, string | null | undefined>;
    for (const key of fieldKeys) {
      const val = attrs[key];
      draft[item.id][key] = val == null ? "" : String(val);
    }
  }
  return draft;
}

function snapshotDraft(draft: DraftMap): DraftMap {
  return JSON.parse(JSON.stringify(draft)) as DraftMap;
}

export default function HomePage() {
  const {
    loading: ascLoading,
    error: ascError,
    setError: setAscError,
    fetchApps,
    fetchVersions,
    fetchVersionLocalizations,
    fetchAppInfoLocalizations,
    patchVersionLocalization,
    patchAppInfoLocalization,
  } = useAscData();

  const [hasCredentials, setHasCredentials] = useState(false);
  const [credOpen, setCredOpen] = useState(false);

  const [apps, setApps] = useState<AppItem[]>([]);
  const [appId, setAppId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);

  const [versionLocs, setVersionLocs] = useState<VersionLocalization[]>([]);
  const [appInfoLocs, setAppInfoLocs] = useState<AppInfoLocalization[]>([]);

  const [versionDraft, setVersionDraft] = useState<DraftMap>({});
  const [versionOriginal, setVersionOriginal] = useState<DraftMap>({});
  const [appInfoDraft, setAppInfoDraft] = useState<DraftMap>({});
  const [appInfoOriginal, setAppInfoOriginal] = useState<DraftMap>({});

  const [savingVersionId, setSavingVersionId] = useState<string | null>(null);
  const [savingAppInfoId, setSavingAppInfoId] = useState<string | null>(null);

  const versionFieldKeys = useMemo(
    () => VERSION_TEXT_FIELDS.map((f) => f.key),
    [],
  );
  const appInfoFieldKeys = useMemo(
    () => APP_INFO_TEXT_FIELDS.map((f) => f.key),
    [],
  );

  useEffect(() => {
    const creds = loadCredentials();
    setHasCredentials(!!creds);
    if (!creds) setCredOpen(true);
  }, []);

  const onCredentialsSaved = useCallback(() => {
    const creds = loadCredentials();
    setHasCredentials(!!creds);
    if (!creds) setCredOpen(true);
  }, []);

  const loadApps = useCallback(async () => {
    const res = await fetchApps();
    if (res?.data) setApps(res.data);
  }, [fetchApps]);

  useEffect(() => {
    if (hasCredentials) loadApps();
  }, [hasCredentials, loadApps]);

  const loadVersions = useCallback(
    async (id: string) => {
      const res = await fetchVersions(id);
      if (res?.data) {
        const sorted = [...res.data].sort((a, b) =>
          (b.attributes.versionString ?? "").localeCompare(
            a.attributes.versionString ?? "",
          ),
        );
        setVersions(sorted);
        const preferred =
          sorted.find((v) =>
            ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "WAITING_FOR_REVIEW", "READY_FOR_SALE"].includes(
              v.attributes.appStoreState ?? "",
            ),
          ) ?? sorted[0];
        setVersionId(preferred?.id ?? null);
      }
    },
    [fetchVersions],
  );

  const loadLocalizations = useCallback(
    async (vId: string, aId: string) => {
      const [vLocs, aLocs] = await Promise.all([
        fetchVersionLocalizations(vId),
        fetchAppInfoLocalizations(aId),
      ]);
      if (vLocs?.data) {
        setVersionLocs(vLocs.data);
        const draft = buildDraftFromLocalizations(vLocs.data, versionFieldKeys);
        setVersionDraft(draft);
        setVersionOriginal(snapshotDraft(draft));
      }
      if (aLocs?.data) {
        setAppInfoLocs(aLocs.data);
        const draft = buildDraftFromLocalizations(aLocs.data, appInfoFieldKeys);
        setAppInfoDraft(draft);
        setAppInfoOriginal(snapshotDraft(draft));
      }
    },
    [fetchVersionLocalizations, fetchAppInfoLocalizations, versionFieldKeys, appInfoFieldKeys],
  );

  useEffect(() => {
    if (appId) loadVersions(appId);
    else {
      setVersions([]);
      setVersionId(null);
    }
  }, [appId, loadVersions]);

  useEffect(() => {
    if (versionId && appId) loadLocalizations(versionId, appId);
  }, [versionId, appId, loadLocalizations]);

  const selectedApp = apps.find((a) => a.id === appId);
  const selectedVersion = versions.find((v) => v.id === versionId);

  const versionRows = useMemo(
    () =>
      versionLocs.map((loc) => ({
        id: loc.id,
        locale: loc.attributes.locale,
      })),
    [versionLocs],
  );

  const appInfoRows = useMemo(
    () =>
      appInfoLocs.map((loc) => ({
        id: loc.id,
        locale: loc.attributes.locale,
      })),
    [appInfoLocs],
  );

  const saveVersionRow = async (row: { id: string; locale: string }) => {
    const draft = versionDraft[row.id];
    const original = versionOriginal[row.id];
    if (!draft) return false;

    const attributes: Record<string, string | null> = {};
    for (const key of versionFieldKeys) {
      if (draft[key] !== original?.[key]) {
        attributes[key] = draft[key] || null;
      }
    }
    if (Object.keys(attributes).length === 0) return true;

    setSavingVersionId(row.id);
    const ok = await patchVersionLocalization(row.id, attributes);
    setSavingVersionId(null);
    if (ok !== null) {
      setVersionOriginal((prev) => ({
        ...prev,
        [row.id]: { ...draft },
      }));
      return true;
    }
    return false;
  };

  const saveAppInfoRow = async (row: { id: string; locale: string }) => {
    const draft = appInfoDraft[row.id];
    const original = appInfoOriginal[row.id];
    if (!draft) return false;

    const attributes: Record<string, string | null> = {};
    for (const key of appInfoFieldKeys) {
      if (draft[key] !== original?.[key]) {
        attributes[key] = draft[key] || null;
      }
    }
    if (Object.keys(attributes).length === 0) return true;

    setSavingAppInfoId(row.id);
    const ok = await patchAppInfoLocalization(row.id, attributes);
    setSavingAppInfoId(null);
    if (ok !== null) {
      setAppInfoOriginal((prev) => ({
        ...prev,
        [row.id]: { ...draft },
      }));
      return true;
    }
    return false;
  };

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between px-6 bg-[#001529]">
        <Space>
          <AppstoreOutlined className="text-white text-xl" />
          <Title level={4} className="!text-white !mb-0">
            ASC Page Editor
          </Title>
        </Space>
        <Button
          type="default"
          icon={<ApiOutlined />}
          onClick={() => setCredOpen(true)}
        >
          API ключ
        </Button>
      </Header>

      <Content className="p-6 max-w-[100vw] min-h-0 flex-1 overflow-hidden flex flex-col">
        {!hasCredentials && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            title="Добавьте API ключ App Store Connect, чтобы начать"
            action={
              <Button size="small" onClick={() => setCredOpen(true)}>
                Настроить
              </Button>
            }
          />
        )}

        {ascError && (
          <Alert type="error" showIcon className="mb-4" title={ascError} closable onClose={() => setAscError(null)} />
        )}

        <Card className="mb-4">
          <Space wrap size="large" className="w-full">
            <div>
              <Text type="secondary" className="block text-xs mb-1">
                Приложение
              </Text>
              <Select
                showSearch
                placeholder="Выберите приложение"
                style={{ minWidth: 320 }}
                value={appId ?? undefined}
                onChange={setAppId}
                optionFilterProp="label"
                loading={ascLoading && !apps.length}
                options={apps.map((a) => ({
                  value: a.id,
                  label: `${a.attributes.name} (${a.attributes.bundleId})`,
                }))}
              />
            </div>
            <div>
              <Text type="secondary" className="block text-xs mb-1">
                Версия
              </Text>
              <Select
                placeholder="Версия"
                style={{ minWidth: 280 }}
                value={versionId ?? undefined}
                onChange={setVersionId}
                disabled={!appId}
                options={versions.map((v) => ({
                  value: v.id,
                  label: `${v.attributes.versionString} — ${v.attributes.appStoreState}`,
                }))}
              />
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (appId && versionId) loadLocalizations(versionId, appId);
              }}
              disabled={!versionId}
            >
              Обновить данные
            </Button>
          </Space>
          {selectedApp && selectedVersion && (
            <Text type="secondary" className="block mt-3">
              {selectedApp.attributes.name} · v{selectedVersion.attributes.versionString} ·{" "}
              {selectedVersion.attributes.appStoreState}
            </Text>
          )}
        </Card>

        {versionId && appId && (
          <Tabs
            className="flex-1 min-h-0 [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
            defaultActiveKey="version"
            items={[
              {
                key: "version",
                label: "Версия",
                children: (
                  <LocaleTabsEditor
                    locales={versionRows}
                    fields={VERSION_TEXT_FIELDS}
                    getValue={(row, field) =>
                      versionDraft[row.id]?.[field] ?? ""
                    }
                    getOriginal={(id, field) =>
                      versionOriginal[id]?.[field] ?? ""
                    }
                    onDraftChange={(id, field, value) =>
                      setVersionDraft((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], [field]: value },
                      }))
                    }
                    onSaveRow={saveVersionRow}
                    savingId={savingVersionId}
                  />
                ),
              },
              {
                key: "appinfo",
                label: "App Info",
                children: (
                  <LocaleTabsEditor
                    locales={appInfoRows}
                    fields={APP_INFO_TEXT_FIELDS}
                    getValue={(row, field) =>
                      appInfoDraft[row.id]?.[field] ?? ""
                    }
                    getOriginal={(id, field) =>
                      appInfoOriginal[id]?.[field] ?? ""
                    }
                    onDraftChange={(id, field, value) =>
                      setAppInfoDraft((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], [field]: value },
                      }))
                    }
                    onSaveRow={saveAppInfoRow}
                    savingId={savingAppInfoId}
                  />
                ),
              },
              {
                key: "screenshots",
                label: "Скриншоты",
                children: (
                  <ScreenshotsPanel versionLocalizations={versionRows} />
                ),
              },
            ]}
          />
        )}
      </Content>

      <CredentialsModal
        open={credOpen}
        onClose={() => setCredOpen(false)}
        onSaved={onCredentialsSaved}
      />
    </Layout>
  );
}
