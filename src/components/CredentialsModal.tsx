"use client";

import { Alert, Form, Input, Modal, Typography } from "antd";
import type { AscCredentials } from "@/lib/asc/types";
import {
  loadCredentials,
  saveCredentials,
  clearCredentials,
} from "@/lib/credentials-storage";

const { Text, Link } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CredentialsModal({ open, onClose, onSaved }: Props) {
  const [form] = Form.useForm<AscCredentials>();

  const hydrateForm = () => {
    const saved = loadCredentials();
    if (saved) {
      form.setFieldsValue(saved);
    } else {
      form.resetFields();
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    saveCredentials(values);
    onSaved();
    onClose();
  };

  const handleClear = () => {
    clearCredentials();
    form.resetFields();
    onSaved();
  };

  return (
    <Modal
      title="API ключ App Store Connect"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      afterOpenChange={(visible) => {
        if (visible) hydrateForm();
      }}
      okText="Сохранить"
      cancelText="Отмена"
      width={640}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        title="Данные хранятся только в localStorage этого браузера и отправляются на локальный API-прокси для подписи JWT."
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="issuerId"
          label="Issuer ID"
          rules={[{ required: true, message: "Укажите Issuer ID" }]}
        >
          <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </Form.Item>
        <Form.Item
          name="keyId"
          label="Key ID"
          rules={[{ required: true, message: "Укажите Key ID" }]}
        >
          <Input placeholder="XXXXXXXXXX" />
        </Form.Item>
        <Form.Item
          name="privateKey"
          label="Приватный ключ (.p8)"
          rules={[{ required: true, message: "Вставьте содержимое .p8" }]}
          extra={
            <Text type="secondary">
              Users and Access → Integrations → App Store Connect API → Generate
              API Key
            </Text>
          }
        >
          <Input.TextArea
            rows={8}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;..."
            className="font-mono text-xs"
          />
        </Form.Item>
      </Form>
      <Link type="danger" onClick={handleClear}>
        Удалить сохранённые ключи
      </Link>
    </Modal>
  );
}
