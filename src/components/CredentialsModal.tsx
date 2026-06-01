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
      title="App Store Connect API Key"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      afterOpenChange={(visible) => {
        if (visible) hydrateForm();
      }}
      okText="Save"
      cancelText="Cancel"
      width={640}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        title="Credentials are stored only in this browser's localStorage and sent to your API proxy for JWT signing."
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="issuerId"
          label="Issuer ID"
          rules={[{ required: true, message: "Enter Issuer ID" }]}
        >
          <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </Form.Item>
        <Form.Item
          name="keyId"
          label="Key ID"
          rules={[{ required: true, message: "Enter Key ID" }]}
        >
          <Input placeholder="XXXXXXXXXX" />
        </Form.Item>
        <Form.Item
          name="privateKey"
          label="Private key (.p8)"
          rules={[{ required: true, message: "Paste .p8 contents" }]}
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
        Remove saved keys
      </Link>
    </Modal>
  );
}
