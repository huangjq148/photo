"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Ellipsis } from "lucide-react";
import { PhotoGalleryControlsModal } from "@/components/photos/photo-gallery-controls-modal";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";

type PhotoGalleryFloatToolsProps = {
  showTakenAt: boolean;
  onToggleTakenAt: () => void;
  photoSize: PhotoSize;
  onPhotoSizeChange: (value: PhotoSize) => void;
  layoutMode: "grid" | "waterfall";
  onLayoutModeChange: (value: "grid" | "waterfall") => void;
  groupMode: "none" | "month" | "year";
};

export function PhotoGalleryFloatTools({
  showTakenAt,
  onToggleTakenAt,
  photoSize,
  onPhotoSizeChange,
  layoutMode,
  onLayoutModeChange,
  groupMode,
}: PhotoGalleryFloatToolsProps) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > 160);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <>
      <div
        className={`fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2 transition duration-200 lg:bottom-6 lg:right-6 ${
          visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full noir-glass-chip text-[var(--text)] shadow-2xl transition hover:border-[var(--border-strong)]"
          aria-label="更多操作"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="更多操作"
        >
          <Ellipsis aria-hidden="true" size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full noir-glass-chip text-[var(--text)] shadow-2xl transition hover:border-[var(--border-strong)]"
          aria-label="返回顶部"
          title="返回顶部"
        >
          <ArrowUp aria-hidden="true" size={18} />
        </button>
      </div>

      <PhotoGalleryControlsModal
        open={open}
        showTakenAt={showTakenAt}
        onToggleTakenAt={onToggleTakenAt}
        photoSize={photoSize}
        onPhotoSizeChange={onPhotoSizeChange}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        groupMode={groupMode}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
