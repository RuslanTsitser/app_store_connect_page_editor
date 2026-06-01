"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Image,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  DISPLAY_TYPE_LABELS,
  DISPLAY_TYPE_PRIORITY,
  displayTypeLabel,
  fetchScreenshotsForAllLocales,
  type ScreenshotItem,
} from "@/lib/asc-screenshots";

const { Text } = Typography;

interface Props {
  versionLocalizations: { id: string; locale: string }[];
}

const DEFAULT_DISPLAY_TYPE = "APP_IPHONE_69";

const STATIC_DISPLAY_OPTIONS = [
  ...DISPLAY_TYPE_PRIORITY.map((value) => ({
    value,
    label: displayTypeLabel(value),
  })),
];

function ScreenshotGallery({
  shots,
}: {
  shots: ScreenshotItem[];
}) {
  if (shots.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Empty description="Нет скриншотов для этого размера" />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="flex flex-wrap gap-4 justify-center max-w-5xl py-2">
        {shots.map((shot) => (
          <div key={shot.id} className="flex flex-col items-center w-[120px]">
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
                  <Tag className="m-0 text-[10px]">{shot.deliveryState}</Tag>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScreenshotsPanel({ versionLocalizations }: Props) {
  const [displayType, setDisplayType] = useState(DEFAULT_DISPLAY_TYPE);
  const [discoveredTypes, setDiscoveredTypes] = useState<string[]>([]);
  const [shotsByLocale, setShotsByLocale] = useState<
    Record<string, ScreenshotItem[]>
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

  const displayTypeOptions = useMemo(() => {
    const known = new Set<string>(
      STATIC_DISPLAY_OPTIONS.map((o) => o.value),
    );
    const extra = discoveredTypes
      .filter((t) => !known.has(t))
      .map((value) => ({
        value,
        label: DISPLAY_TYPE_LABELS[value] ?? value,
      }));
    return [...STATIC_DISPLAY_OPTIONS, ...extra];
  }, [discoveredTypes]);

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
      const result = await fetchScreenshotsForAllLocales(
        sortedLocales,
        displayType,
      );
      if (seq !== loadSeq.current) return;

      setShotsByLocale(result.byLocale);
      setDiscoveredTypes(result.availableDisplayTypes);
      setHint(result.hint);
      setLoadErrors(result.errors);

      if (
        result.availableDisplayTypes.length > 0 &&
        !result.availableDisplayTypes.includes(displayType)
      ) {
        const fallback =
          result.usedDisplayType ?? result.availableDisplayTypes[0];
        if (fallback && fallback !== displayType) {
          setDisplayType(fallback);
        }
      }
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, [sortedLocales, displayType]);

  useEffect(() => {
    void loadAll();
  }, [localizationKey, displayType, loadAll]);

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
        const shots = shotsByLocale[loc.locale] ?? [];
        return {
          key: loc.id,
          label: (
            <Space size={4}>
              <span>{loc.locale}</span>
              {shots.length > 0 && (
                <Text type="secondary" className="text-xs">
                  {shots.length}
                </Text>
              )}
            </Space>
          ),
          children: <ScreenshotGallery shots={shots} />,
        };
      }),
    [sortedLocales, shotsByLocale],
  );

  if (!sortedLocales.length) {
    return (
      <Text type="secondary">Нет локалей для выбранной версии приложения.</Text>
    );
  }

  return (
    <div>
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="Скриншоты по локалям. Выберите тип устройства, если превью пустые."
      />

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

      <Space wrap className="mb-4 w-full justify-center">
        <div>
          <Text type="secondary" className="block text-xs mb-1">
            Тип устройства
          </Text>
          <Select
            value={displayType}
            onChange={setDisplayType}
            options={displayTypeOptions}
            style={{ minWidth: 240 }}
          />
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
          Обновить
        </Button>
      </Space>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" description="Загрузка скриншотов…" />
        </div>
      ) : (
        <Tabs
          activeKey={activeLocaleId}
          onChange={setActiveLocaleId}
          items={tabItems}
          type="card"
          tabBarGutter={8}
          className="locale-tabs-editor min-h-0 [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav-wrap]:overflow-auto"
          destroyOnHidden={false}
        />
      )}
    </div>
  );
}
