"use client";

import React from "react";

export type PhotoSize = "small" | "medium" | "large";

type PhotoGallerySizeControlProps = {
  value: PhotoSize;
  onChange: (value: PhotoSize) => void;
};

const sizes: { value: PhotoSize; label: string }[] = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
];

export function PhotoGallerySizeControl({ value, onChange }: PhotoGallerySizeControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted)]">图片尺寸</span>
      <div className="flex rounded-full border border-[var(--border)] bg-black p-1">
        {sizes.map((size) => (
          <button
            key={size.value}
            type="button"
            onClick={() => onChange(size.value)}
            className={`inline-flex h-8 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition ${
              value === size.value
                ? "bg-[var(--accent)] text-black"
                : "text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
            }`}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
