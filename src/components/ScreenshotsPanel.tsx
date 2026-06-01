"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Empty,
  Image,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  DISPLAY_TYPE_LABELS,
  DISPLAY_TYPE_PRIORITY,
  displayTypeLabel,
  fetchScreenshotsForAllLocales,
  type DeviceScreenshotGroup,
  type ScreenshotItem,
} from "@/lib/asc-screenshots";
import {
  createScreenshotSet,
  deleteScreenshot,
  reorderScreenshots,
  uploadScreenshotFile,
} from "@/lib/asc-screenshot-ops";
import { sizeHintForDisplayType } from "@/lib/asc/screenshot-sizes";
import { AscApiError } from "@/lib/asc-client";

const { Text } = Typography;

const PRIMARY_DISPLAY_TYPE = DISPLAY_TYPE_PRIORITY[0];
const REQUIRED_DISPLAY_TYPES = new Set<string>([
  "APP_IPHONE_69",
  "APP_IPAD_PRO_3GEN_129",
]);

function displayTypeOrderIndex(displayType: string): number {
  const idx = DISPLAY_TYPE_PRIORITY.indexOf(
    displayType as (typeof DISPLAY_TYPE_PRIORITY)[number],
  );
  return idx === -1 ? 999 : idx;
}

function sortGroupsPrimaryFirst(
  groups: DeviceScreenshotGroup[],
): DeviceScreenshotGroup[] {
  return [...groups].sort((a, b) => {
    if (a.displayType === PRIMARY_DISPLAY_TYPE && b.displayType !== PRIMARY_DISPLAY_TYPE)
      return -1;
    if (b.displayType === PRIMARY_DISPLAY_TYPE && a.displayType !== PRIMARY_DISPLAY_TYPE)
      return 1;
    return (
      displayTypeOrderIndex(a.displayType) - displayTypeOrderIndex(b.displayType)
    );
  });
}

interface Props {
  versionLocalizations: { id: string; locale: string }[];
  primaryLocale?: string | null;
}

function totalShots(groups: DeviceScreenshotGroup[]): number {
  return groups.reduce((n, g) => n + g.shots.length, 0);
}

function reorderIds(
  shots: ScreenshotItem[],
  fromId: string,
  toId: string,
): string[] {
  const ids = shots.map((s) => s.id);
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function DeviceGroupSection({
  group,
  onChanged,
}: {
  group: DeviceScreenshotGroup;
  onChanged: () => void;
}) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      const text =
        e instanceof AscApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Ошибка";
      message.error(text);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (files: File[], replaceId?: string) => {
    if (replaceId) {
      await deleteScreenshot(replaceId);
    }
    let count = group.shots.length;
    if (replaceId) count -= 1;

    for (const file of files) {
      await uploadScreenshotFile(group.setId, file, group.displayType, count);
      count += 1;
    }
    message.success(
      files.length === 1 ? "Скриншот загружен" : `Загружено: ${files.length}`,
    );
  };

  const uploadProps: UploadProps = {
    accept: "image/png,image/jpeg",
    showUploadList: false,
    multiple: true,
    disabled: busy,
    beforeUpload: (file, fileList) => {
      const isLast = fileList[fileList.length - 1] === file;
      if (!isLast) return false;
      void run(async () => {
        await handleUploadFiles(
          fileList as unknown as File[],
          replaceTargetRef.current ?? undefined,
        );
        replaceTargetRef.current = null;
      });
      return false;
    },
  };

  const onDropReorder = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ordered = reorderIds(group.shots, dragId, targetId);
    await reorderScreenshots(group.setId, ordered);
    message.success("Порядок сохранён");
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Text strong>{displayTypeLabel(group.displayType)}</Text>
          {group.displayType === PRIMARY_DISPLAY_TYPE && (
            <Tag color="blue" className="ml-2">
              Primary
            </Tag>
          )}
          {REQUIRED_DISPLAY_TYPES.has(group.displayType) && (
            <Tag color="red" className="ml-2">
              Обязательный
            </Tag>
          )}
          <Text type="secondary" className="ml-2 text-xs">
            {sizeHintForDisplayType(group.displayType)}
          </Text>
        </div>
        <Space wrap size="small">
          <Upload {...uploadProps}>
            <Button
              size="small"
              icon={<PlusOutlined />}
              loading={busy}
              disabled={group.shots.length >= 10}
            >
              Добавить
            </Button>
          </Upload>
        </Space>
      </div>

      {group.shots.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Нет скриншотов в этом наборе"
          className="my-4"
        >
          <Upload {...uploadProps}>
            <Button type="primary" size="small" icon={<PlusOutlined />}>
              Загрузить
            </Button>
          </Upload>
        </Empty>
      ) : (
        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
          {group.shots.map((shot) => (
            <div
              key={shot.id}
              draggable={!busy}
              onDragStart={() => setDragId(shot.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void run(() => onDropReorder(shot.id));
              }}
              className={`flex shrink-0 flex-col items-center w-[124px] rounded border border-transparent p-1 transition-colors ${
                dragId === shot.id ? "border-blue-400 bg-blue-50" : ""
              }`}
            >
              <Tooltip title="Перетащите для смены порядка">
                <HolderOutlined className="mb-1 cursor-grab text-gray-400 active:cursor-grabbing" />
              </Tooltip>
              {shot.url ? (
                <Image
                  src={shot.url}
                  width={110}
                  alt={shot.fileName}
                  className="rounded"
                />
              ) : (
                <div className="flex h-[200px] w-[110px] flex-col items-center justify-center gap-1 rounded bg-gray-100 p-1 text-center text-xs">
                  <span className="break-all">{shot.fileName}</span>
                  {shot.deliveryState && (
                    <Tag className="m-0 text-[10px]">{shot.deliveryState}</Tag>
                  )}
                </div>
              )}
              <Space size={4} className="mt-2">
                <Tooltip title="Заменить (удалить и загрузить новый)">
                  <Button
                    type="text"
                    size="small"
                    icon={<SwapOutlined />}
                    disabled={busy}
                    onClick={() => {
                      replaceTargetRef.current = shot.id;
                      fileInputRef.current?.click();
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить скриншот?"
                  onConfirm={() =>
                    run(async () => {
                      await deleteScreenshot(shot.id);
                      message.success("Удалено");
                    })
                  }
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={busy}
                  />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (!files?.length) return;
          const replaceId = replaceTargetRef.current;
          void run(async () => {
            await handleUploadFiles(Array.from(files), replaceId ?? undefined);
            replaceTargetRef.current = null;
          });
          e.target.value = "";
        }}
      />
    </section>
  );
}

function ScreenshotLocalePane({
  localizationId,
  groups,
  onChanged,
}: {
  localizationId: string;
  groups: DeviceScreenshotGroup[];
  onChanged: () => void;
}) {
  const { message } = App.useApp();
  const [creating, setCreating] = useState(false);
  const [newDisplayType, setNewDisplayType] = useState<string>(
    DISPLAY_TYPE_PRIORITY[0],
  );

  const existingTypes = new Set(groups.map((g) => g.displayType));
  const availableTypes = DISPLAY_TYPE_PRIORITY.filter(
    (t) => !existingTypes.has(t),
  );

  const createSet = async () => {
    if (!newDisplayType) return;
    setCreating(true);
    try {
      await createScreenshotSet(localizationId, newDisplayType);
      message.success(`Набор «${displayTypeLabel(newDisplayType)}» создан`);
      onChanged();
    } catch (e) {
      const text =
        e instanceof AscApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Ошибка";
      message.error(text);
    } finally {
      setCreating(false);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="py-8">
        <Empty description="Нет наборов скриншотов для этой локали">
          <Space orientation="vertical" className="mt-4">
            <Select
              style={{ minWidth: 280 }}
              value={newDisplayType}
              onChange={setNewDisplayType}
              options={DISPLAY_TYPE_PRIORITY.map((t) => ({
                value: t,
                label: DISPLAY_TYPE_LABELS[t] ?? t,
              }))}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={creating}
              onClick={() => void createSet()}
            >
              Создать набор
            </Button>
          </Space>
        </Empty>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 overflow-y-auto max-h-[calc(100vh-280px)] py-2">
      {sortGroupsPrimaryFirst(groups).map((group) => (
        <DeviceGroupSection key={group.setId} group={group} onChanged={onChanged} />
      ))}

      {availableTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <Text type="secondary">Добавить размер устройства:</Text>
          <Select
            size="small"
            style={{ minWidth: 220 }}
            value={newDisplayType}
            onChange={setNewDisplayType}
            options={availableTypes.map((t) => ({
              value: t,
              label: `${DISPLAY_TYPE_LABELS[t] ?? t}${t === PRIMARY_DISPLAY_TYPE ? " — Primary" : ""}${REQUIRED_DISPLAY_TYPES.has(t) ? " — Обязательный" : ""}`,
            }))}
          />
          <Button
            size="small"
            icon={<PlusOutlined />}
            loading={creating}
            onClick={() => void createSet()}
          >
            Создать набор
          </Button>
        </div>
      )}
    </div>
  );
}

export function ScreenshotsPanel({ versionLocalizations, primaryLocale }: Props) {
  const [shotsByLocale, setShotsByLocale] = useState<
    Record<string, DeviceScreenshotGroup[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [activeLocaleId, setActiveLocaleId] = useState<string | undefined>();
  const loadSeq = useRef(0);

  const sortedLocales = useMemo(() => {
    const list = [...versionLocalizations].sort((a, b) =>
      a.locale.localeCompare(b.locale),
    );
    if (!primaryLocale) return list;
    return list.sort((a, b) => {
      if (a.locale === primaryLocale && b.locale !== primaryLocale) return -1;
      if (b.locale === primaryLocale && a.locale !== primaryLocale) return 1;
      return a.locale.localeCompare(b.locale);
    });
  }, [versionLocalizations, primaryLocale]);

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
              {primaryLocale && loc.locale === primaryLocale && (
                <Tag color="blue" className="m-0">
                  Primary
                </Tag>
              )}
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
            <ScreenshotLocalePane
              localizationId={loc.id}
              groups={groups}
              onChanged={loadAll}
            />
          ),
        };
      }),
    [sortedLocales, shotsByLocale, loading, loadAll],
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
