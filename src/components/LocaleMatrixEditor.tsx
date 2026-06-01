"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DiffOutlined, SaveOutlined } from "@ant-design/icons";
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

export function LocaleMatrixEditor<T extends LocaleRow>({
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

  const columns = useMemo(() => {
    const fieldColumns = fields.map((field) => ({
      title: field.label,
      key: field.key,
      width: field.multiline ? 280 : 200,
      render: (_: unknown, record: T) => {
        const value = getValue(record, field.key);
        const original = getOriginal(record.id, field.key);
        const dirty = value !== original;

        return (
          <div className="flex flex-col gap-1">
            {field.multiline ? (
              <Input.TextArea
                value={value}
                onChange={(e) =>
                  onDraftChange(record.id, field.key, e.target.value)
                }
                autoSize={{ minRows: 3, maxRows: 10 }}
              />
            ) : (
              <Input
                value={value}
                onChange={(e) =>
                  onDraftChange(record.id, field.key, e.target.value)
                }
              />
            )}
            <Space size="small">
              {dirty && <Tag color="gold">изменено</Tag>}
              <Tooltip title="Сравнить с исходным">
                <Button
                  size="small"
                  icon={<DiffOutlined />}
                  disabled={!dirty && value === original}
                  onClick={() =>
                    setDiffState({
                      title: `${record.locale} — ${field.label}`,
                      oldValue: original,
                      newValue: value,
                    })
                  }
                />
              </Tooltip>
            </Space>
          </div>
        );
      },
    }));

    return [
      {
        title: "Локаль",
        dataIndex: "locale",
        key: "locale",
        fixed: "left" as const,
        width: 120,
        render: (locale: string, record: T) => (
          <div>
            <Text strong>{locale}</Text>
            <div>
              <Button
                type="link"
                size="small"
                icon={<SaveOutlined />}
                loading={savingId === record.id}
                onClick={async () => {
                  const ok = await onSaveRow(record);
                  if (ok) message.success(`Сохранено: ${locale}`);
                }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        ),
      },
      ...fieldColumns,
    ];
  }, [
    fields,
    getValue,
    getOriginal,
    onDraftChange,
    onSaveRow,
    savingId,
  ]);

  return (
    <>
      <Table
        dataSource={sortedLocales}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: "max-content" }}
        size="small"
        bordered
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
