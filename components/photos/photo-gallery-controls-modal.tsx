"use client";

import { Grid2x2, Rows3 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { PhotoGallerySizeControl, type PhotoSize } from "@/components/photos/photo-gallery-size-control";

type PhotoGalleryControlsModalProps = {
  open: boolean;
  showTakenAt: boolean;
  onToggleTakenAt: () => void;
  photoSize: PhotoSize;
  onPhotoSizeChange: (value: PhotoSize) => void;
  layoutMode: "grid" | "waterfall";
  onLayoutModeChange: (value: "grid" | "waterfall") => void;
  groupMode: "none" | "month" | "year";
  onClose: () => void;
};

export function PhotoGalleryControlsModal({
  open,
  showTakenAt,
  onToggleTakenAt,
  photoSize,
  onPhotoSizeChange,
  layoutMode,
  onLayoutModeChange,
  groupMode,
  onClose,
}: PhotoGalleryControlsModalProps) {
  const isGrouped = groupMode !== "none";
  const layoutLabel = layoutMode === "grid" ? "网格" : "瀑布流";
  const groupLabel = groupMode === "month" ? "按月" : groupMode === "year" ? "按年" : "不分组";
  return (
    <Modal open={open} title="照片操作" size="sm" onClose={onClose}>
      <div className="space-y-3">
        <section className="noir-glass-panel-strong rounded-2xl p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">显示时间</p>
                <p className="mt-1 text-xs text-[var(--muted)]">缩略图左下角显示拍摄或上传时间</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showTakenAt}
                onClick={onToggleTakenAt}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent p-0.5 transition ${
                  showTakenAt ? "bg-blue-500" : "bg-white/15"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                    showTakenAt ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--text)]">图片尺寸</p>
              <div className="mt-3">
                <PhotoGallerySizeControl value={photoSize} onChange={onPhotoSizeChange} compact />
              </div>
            </div>

            {!isGrouped ? (
              <div>
                <p className="text-sm font-medium text-[var(--text)]">排列方式</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onLayoutModeChange("grid")}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
                      layoutMode === "grid"
                        ? "bg-[var(--accent)] text-black"
                        : "noir-glass-chip text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Grid2x2 aria-hidden="true" size={16} />
                    网格
                  </button>
                  <button
                    type="button"
                    onClick={() => onLayoutModeChange("waterfall")}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
                      layoutMode === "waterfall"
                        ? "bg-[var(--accent)] text-black"
                        : "noir-glass-chip text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Rows3 aria-hidden="true" size={16} />
                    瀑布流
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <div className="rounded-2xl border border-[var(--border)] bg-black/30 px-4 py-3 text-xs text-[var(--muted)]">
          当前偏好：{showTakenAt ? "显示时间" : "隐藏时间"} · {layoutLabel} · {groupLabel} · {photoSize}
        </div>
      </div>
    </Modal>
  );
}
