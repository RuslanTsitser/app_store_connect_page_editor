"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DiffOutlined } from "@ant-design/icons";
import { TextDiffModal } from "./TextDiffModal";

const { Text } = Typography;

type FieldDef = {
  key: string;
  label: string;
  multiline: boolean;
};

interface LocaleRow {
  id: string;
  locale: string;
}

interface Props<T extends LocaleRow> {
  locales: T[];
  fields: readonly FieldDef[];
  getValue: (row: T, fieldKey: string) => string;
  getOriginal: (id: string, fieldKey: string) => string;
  onDraftChange: (id: string, fieldKey: string, value: string) => void;
  onSaveRow: (row: T) => Promise<boolean>;
  savingId?: string | null;
}

function localeHasChanges<T extends LocaleRow>(
  row: T,
  fields: readonly FieldDef[],
  getValue: Props<T>["getValue"],
  getOriginal: Props<T>["getOriginal"],
): boolean {
  return fields.some(
    (f) => getValue(row, f.key) !== getOriginal(row.id, f.key),
  );
}

function LocalePane<T extends LocaleRow>({
  row,
  fields,
  getValue,
  getOriginal,
  onDraftChange,
  onSaveRow,
  savingId,
  onDiff,
}: {
  row: T;
  fields: readonly FieldDef[];
  getValue: Props<T>["getValue"];
  getOriginal: Props<T>["getOriginal"];
  onDraftChange: Props<T>["onDraftChange"];
  onSaveRow: Props<T>["onSaveRow"];
  savingId?: string | null;
  onDiff: (title: string, oldValue: string, newValue: string) => void;
}) {
  const { message } = App.useApp();
  const dirty = localeHasChanges(row, fields, getValue, getOriginal);

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-320px)] px-2">
      <div className="w-full flex justify-center">
        <Form layout="vertical" className="w-full max-w-3xl">
        {fields.map((field) => {
          const value = getValue(row, field.key);
          const original = getOriginal(row.id, field.key);
          const fieldDirty = value !== original;

          return (
            <Form.Item
              key={field.key}
              label={
                <Space>
                  <span>{field.label}</span>
                  {fieldDirty && <Tag color="gold">изменено</Tag>}
                </Space>
              }
            >
              {field.multiline ? (
                <Input.TextArea
                  value={value}
                  onChange={(e) =>
                    onDraftChange(row.id, field.key, e.target.value)
                  }
                  autoSize={{ minRows: 4, maxRows: 16 }}
                />
              ) : (
                <Input
                  value={value}
                  onChange={(e) =>
                    onDraftChange(row.id, field.key, e.target.value)
                  }
                />
              )}
              <div className="mt-1">
                <Space size="small">
                  <Tooltip title="Сравнить с исходным">
                    <Button
                      size="small"
                      icon={<DiffOutlined />}
                      disabled={!fieldDirty}
                      onClick={() =>
                        onDiff(
                          `${row.locale} — ${field.label}`,
                          original,
                          value,
                        )
                      }
                    >
                      Diff
                    </Button>
                  </Tooltip>
                  {fieldDirty && (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        loading={savingId === row.id}
                        onClick={async () => {
                          const ok = await onSaveRow(row);
                          if (ok) message.success(`Сохранено: ${row.locale}`);
                        }}
                      >
                        Сохранить
                      </Button>
                      <Button
                        size="small"
                        onClick={() => onDraftChange(row.id, field.key, original)}
                      >
                        Сбросить
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </Form.Item>
          );
        })}
        </Form>
      </div>
    </div>
  );
}

export function LocaleTabsEditor<T extends LocaleRow>({
  locales,
  fields,
  getValue,
  getOriginal,
  onDraftChange,
  onSaveRow,
  savingId,
}: Props<T>) {
  const [diffState, setDiffState] = useState<{
    title: string;
    oldValue: string;
    newValue: string;
  } | null>(null);

  const sortedLocales = useMemo(
    () => [...locales].sort((a, b) => a.locale.localeCompare(b.locale)),
    [locales],
  );

  const [activeKey, setActiveKey] = useState<string | undefined>();

  useEffect(() => {
    if (!sortedLocales.length) {
      setActiveKey(undefined);
      return;
    }
    const stillExists = sortedLocales.some((l) => l.id === activeKey);
    if (!stillExists) {
      setActiveKey(sortedLocales[0].id);
    }
  }, [sortedLocales, activeKey]);

  const tabItems = useMemo(
    () =>
      sortedLocales.map((row) => {
        const dirty = localeHasChanges(row, fields, getValue, getOriginal);
        return {
          key: row.id,
          label: (
            <Space size={4}>
              <span>{row.locale}</span>
              {dirty && (
                <span
                  className="inline-block w-2 h-2 rounded-full bg-amber-500"
                  title="Есть изменения"
                />
              )}
            </Space>
          ),
          children: (
            <LocalePane
              row={row}
              fields={fields}
              getValue={getValue}
              getOriginal={getOriginal}
              onDraftChange={onDraftChange}
              onSaveRow={onSaveRow}
              savingId={savingId}
              onDiff={(title, oldValue, newValue) =>
                setDiffState({ title, oldValue, newValue })
              }
            />
          ),
        };
      }),
    [
      sortedLocales,
      fields,
      getValue,
      getOriginal,
      onDraftChange,
      onSaveRow,
      savingId,
    ],
  );

  if (!sortedLocales.length) {
    return (
      <Text type="secondary">Нет локалей для выбранной версии приложения.</Text>
    );
  }

  return (
    <>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={tabItems}
        type="card"
        tabBarGutter={8}
        className="locale-tabs-editor min-h-0 [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav-wrap]:overflow-auto"
        destroyOnHidden={false}
      />
      <TextDiffModal
        open={!!diffState}
        title={diffState?.title ?? ""}
        oldValue={diffState?.oldValue ?? ""}
        newValue={diffState?.newValue ?? ""}
        onClose={() => setDiffState(null)}
      />
    </>
  );
}
