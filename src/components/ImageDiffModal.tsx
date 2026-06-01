"use client";

import { Col, Empty, Image, Modal, Row, Tag, Typography } from "antd";

const { Text } = Typography;

interface Props {
  open: boolean;
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftUrl?: string | null;
  rightUrl?: string | null;
  onClose: () => void;
}

export function ImageDiffModal({
  open,
  title,
  leftLabel,
  rightLabel,
  leftUrl,
  rightUrl,
  onClose,
}: Props) {
  const changed = leftUrl !== rightUrl;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(96vw, 1200px)"
      destroyOnHidden
    >
      {changed ? (
        <Tag color="orange" className="mb-4">
          Изображения различаются
        </Tag>
      ) : (
        <Tag color="green" className="mb-4">
          Без изменений
        </Tag>
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Text strong className="block mb-2">
            {leftLabel}
          </Text>
          {leftUrl ? (
            <Image src={leftUrl} alt={leftLabel} className="rounded border" />
          ) : (
            <Empty description="Нет изображения" />
          )}
        </Col>
        <Col xs={24} md={12}>
          <Text strong className="block mb-2">
            {rightLabel}
          </Text>
          {rightUrl ? (
            <Image src={rightUrl} alt={rightLabel} className="rounded border" />
          ) : (
            <Empty description="Нет изображения" />
          )}
        </Col>
      </Row>
    </Modal>
  );
}
