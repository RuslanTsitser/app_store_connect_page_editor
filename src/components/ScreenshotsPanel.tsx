"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { DiffOutlined, ReloadOutlined } from "@ant-design/icons";
import { ImageDiffModal } from "./ImageDiffModal";
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

export function ScreenshotsPanel({ versionLocalizations }: Props) {
  const [displayType, setDisplayType] = useState(DEFAULT_DISPLAY_TYPE);
  const [discoveredTypes, setDiscoveredTypes] = useState<string[]>([]);
  const [baselineLocale, setBaselineLocale] = useState<string | null>(null);
  const [shotsByLocale, setShotsByLocale] = useState<
    Record<string, ScreenshotItem[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const loadSeq = useRef(0);
  const [diff, setDiff] = useState<{
    title: string;
    leftUrl?: string | null;
    rightUrl?: string | null;
    leftLabel: string;
    rightLabel: string;
  } | null>(null);

  const localizationKey = useMemo(
    () =>
      versionLocalizations
        .map((l) => `${l.id}:${l.locale}`)
        .sort()
        .join("|"),
    [versionLocalizations],
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
    if (!versionLocalizations.length) {
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
        versionLocalizations,
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
  }, [versionLocalizations, displayType]);

  useEffect(() => {
    void loadAll();
  }, [localizationKey, displayType, loadAll]);

  useEffect(() => {
    if (versionLocalizations.length) {
      setBaselineLocale(versionLocalizations[0].locale);
    } else {
      setBaselineLocale(null);
    }
  }, [localizationKey, versionLocalizations]);

  const baselineShots = baselineLocale
    ? (shotsByLocale[baselineLocale] ?? [])
    : [];

  const totalShots = Object.values(shotsByLocale).reduce(
    (n, list) => n + list.length,
    0,
  );

  return (
    <div>
      <Alert
        className="mb-4"
        type="info"
        showIcon
        title="Скриншоты привязаны к версии в App Store Connect. Если пусто — проверьте тип устройства (часто 6.9″ / APP_IPHONE_69) и что файлы загружены в веб-интерфейсе ASC."
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

      <Space wrap className="mb-4 w-full">
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
        <div>
          <Text type="secondary" className="block text-xs mb-1">
            Базовая локаль для сравнения
          </Text>
          <Select
            value={baselineLocale ?? undefined}
            onChange={setBaselineLocale}
            options={versionLocalizations.map((l) => ({
              value: l.locale,
              label: l.locale,
            }))}
            style={{ width: 160 }}
          />
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
          Обновить
        </Button>
        {!loading && (
          <Text type="secondary" className="self-end pb-1">
            Всего превью: {totalShots}
          </Text>
        )}
      </Space>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" description="Загрузка скриншотов…" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {versionLocalizations.map((loc) => {
            const shots = shotsByLocale[loc.locale] ?? [];
            return (
              <Col key={loc.id} xs={24} lg={12} xl={8}>
                <Card title={loc.locale} size="small">
                  {shots.length === 0 ? (
                    <Empty description="Нет скриншотов для этого размера" />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {shots.map((shot, index) => {
                        const base = baselineShots[index];
                        return (
                          <div key={shot.id} className="relative">
                            {shot.url ? (
                              <Image
                                src={shot.url}
                                width={90}
                                alt={shot.fileName}
                                className="rounded"
                              />
                            ) : (
                              <div className="w-[90px] h-[160px] bg-gray-100 rounded flex flex-col items-center justify-center text-xs text-center p-1 gap-1">
                                <span>{shot.fileName}</span>
                                {shot.deliveryState && (
                                  <Tag className="m-0 text-[10px]">
                                    {shot.deliveryState}
                                  </Tag>
                                )}
                              </div>
                            )}
                            <Button
                              size="small"
                              className="mt-1 w-full"
                              icon={<DiffOutlined />}
                              onClick={() =>
                                setDiff({
                                  title: `${loc.locale} — скрин ${index + 1}`,
                                  leftLabel: baselineLocale
                                    ? `${baselineLocale} (база)`
                                    : "База",
                                  rightLabel: loc.locale,
                                  leftUrl: base?.url,
                                  rightUrl: shot.url,
                                })
                              }
                            >
                              Diff
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <ImageDiffModal
        open={!!diff}
        title={diff?.title ?? ""}
        leftLabel={diff?.leftLabel ?? ""}
        rightLabel={diff?.rightLabel ?? ""}
        leftUrl={diff?.leftUrl}
        rightUrl={diff?.rightUrl}
        onClose={() => setDiff(null)}
      />
    </div>
  );
}
