"use client";

import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  title: string;
  src: string;
  onClose: () => void;
};

export function AdminImagePreview({ open, title, src, onClose }: Props) {
  return (
    <Modal open={open} title={title} size="xl" onClose={onClose}>
      <div className="flex min-h-[320px] items-center justify-center bg-black/30 p-4">
        {/* The browser will show a fallback message when the image fails. */}
        <img
          src={src}
          alt={title}
          className="max-h-[70dvh] max-w-full rounded-xl object-contain"
          onError={(event) => {
            event.currentTarget.replaceWith(Object.assign(document.createElement("div"), {
              className: "py-16 text-center text-sm text-white/60",
              textContent: "图片加载失败",
            }));
          }}
        />
      </div>
    </Modal>
  );
}
