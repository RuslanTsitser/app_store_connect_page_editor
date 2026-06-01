"use client";

import dynamic from "next/dynamic";
import { Modal, Spin } from "antd";

const ReactDiffViewer = dynamic(
  () => import("react-diff-viewer-continued").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    ),
  },
);

interface Props {
  open: boolean;
  title: string;
  oldValue: string;
  newValue: string;
  onClose: () => void;
}

export function TextDiffModal({
  open,
  title,
  oldValue,
  newValue,
  onClose,
}: Props) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(96vw, 1100px)"
      destroyOnHidden
    >
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView
        useDarkTheme={false}
        leftTitle="Before"
        rightTitle="After"
        styles={{
          variables: {
            light: {
              diffViewerBackground: "#fafafa",
            },
          },
        }}
      />
    </Modal>
  );
}
