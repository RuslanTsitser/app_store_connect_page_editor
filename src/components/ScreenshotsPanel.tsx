"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Image,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  displayTypeLabel,
  fetchScreenshotsForAllLocales,
  type DeviceScreenshotGroup,
} from "@/lib/asc-screenshots";

const { Text } = Typography;

interface Props {
  versionLocalizations: { id: string; locale: string }[];
}

function totalShots(groups: DeviceScreenshotGroup[]): number {
  return groups.reduce((n, g) => n + g.shots.length, 0);
}

function ScreenshotGallery({ groups }: { groups: DeviceScreenshotGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Empty description="Нет скриншотов" />
      </div>
    );
  }

  const hasAnyShot = groups.some((g) => g.shots.length > 0);
  if (!hasAnyShot) {
    return (
      <div className="flex justify-center py-12">
        <Empty description="Наборы есть, превью пустые" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-auto max-h-[calc(100vh-280px)] py-2 space-y-8">
      {groups.map((group) => {
        if (group.shots.length === 0) return null;

        return (
          <section key={group.displayType}>
            <Text strong className="block mb-3">
              {displayTypeLabel(group.displayType)}
            </Text>
            <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2">
              {group.shots.map((shot) => (
                <div
                  key={shot.id}
                  className="flex shrink-0 flex-col items-center w-[120px]"
                >
                    {shot.url ? (
                      <Image
                        src={shot.url}
                        width={110}
                        alt={shot.fileName}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-[110px] h-[200px] bg-gray-100 rounded flex flex-col items-center justify-center text-xs text-center p-1 gap-1">
                        <span>{shot.fileName}</span>
                        {shot.deliveryState && (
                          <Tag className="m-0 text-[10px]">
                            {shot.deliveryState}
                          </Tag>
                        )}
                      </div>
                    )}
                  </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ScreenshotsPanel({ versionLocalizations }: Props) {
  const [shotsByLocale, setShotsByLocale] = useState<
    Record<string, DeviceScreenshotGroup[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [activeLocaleId, setActiveLocaleId] = useState<string | undefined>();
  const loadSeq = useRef(0);

  const sortedLocales = useMemo(
    () =>
      [...versionLocalizations].sort((a, b) =>
        a.locale.localeCompare(b.locale),
      ),
    [versionLocalizations],
  );

  const localizationKey = useMemo(
    () =>
      sortedLocales
        .map((l) => `${l.id}:${l.locale}`)
        .sort()
        .join("|"),
    [sortedLocales],
  );

  const loadAll = useCallback(async () => {
    if (!sortedLocales.length) {
      setShotsByLocale({});
      setHint(undefined);
      setLoadErrors([]);
      return;
    }

    const seq = ++loadSeq.current;
    setLoading(true);
    setHint(undefined);
    setLoadErrors([]);

    try {
      const result = await fetchScreenshotsForAllLocales(sortedLocales);
      if (seq !== loadSeq.current) return;

      setShotsByLocale(result.byLocale);
      setHint(result.hint);
      setLoadErrors(result.errors);
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, [sortedLocales]);

  useEffect(() => {
    void loadAll();
  }, [localizationKey, loadAll]);

  useEffect(() => {
    if (!sortedLocales.length) {
      setActiveLocaleId(undefined);
      return;
    }
    const stillExists = sortedLocales.some((l) => l.id === activeLocaleId);
    if (!stillExists) {
      setActiveLocaleId(sortedLocales[0].id);
    }
  }, [localizationKey, sortedLocales, activeLocaleId]);

  const tabItems = useMemo(
    () =>
      sortedLocales.map((loc) => {
        const groups = shotsByLocale[loc.locale] ?? [];
        const count = totalShots(groups);
        return {
          key: loc.id,
          label: (
            <Space size={4}>
              <span>{loc.locale}</span>
              {count > 0 && (
                <Text type="secondary" className="text-xs">
                  {count}
                </Text>
              )}
            </Space>
          ),
          children: loading ? (
            <div className="flex justify-center py-16">
              <Spin size="large" description="Загрузка скриншотов…" />
            </div>
          ) : (
            <ScreenshotGallery groups={groups} />
          ),
        };
      }),
    [sortedLocales, shotsByLocale, loading],
  );

  if (!sortedLocales.length) {
    return (
      <Text type="secondary">Нет локалей для выбранной версии приложения.</Text>
    );
  }

  return (
    <div>
      {hint && !loading && (
        <Alert className="mb-4" type="warning" showIcon title={hint} />
      )}

      {loadErrors.length > 0 && !loading && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          title="Ошибки API"
          description={loadErrors.slice(0, 3).join(" · ")}
        />
      )}

      <Tabs
        activeKey={activeLocaleId}
        onChange={setActiveLocaleId}
        items={tabItems}
        type="card"
        tabBarGutter={8}
        tabBarExtraContent={
          <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
            Обновить
          </Button>
        }
        className="locale-tabs-editor min-h-0 [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav-wrap]:overflow-auto"
        destroyOnHidden={false}
      />
    </div>
  );
}
