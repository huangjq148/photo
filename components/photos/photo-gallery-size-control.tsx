"use client";

import React from "react";

export type PhotoSize = "small" | "medium" | "large";

type PhotoGallerySizeControlProps = {
  value: PhotoSize;
  onChange: (value: PhotoSize) => void;
  compact?: boolean;
};

const sizes: { value: PhotoSize; label: string }[] = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
];

export function PhotoGallerySizeControl({ value, onChange, compact = false }: PhotoGallerySizeControlProps) {
  if (compact) {
    return (
      <div className="noir-glass-chip grid grid-cols-3 gap-2 rounded-2xl p-1">
        {sizes.map((size) => (
          <button
            key={size.value}
            type="button"
            onClick={() => onChange(size.value)}
            className={`inline-flex h-9 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-medium transition ${
              value === size.value
                ? "bg-[var(--accent)] text-black"
                : "text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
            }`}
          >
            {size.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted)]">图片尺寸</span>
      <div className="noir-glass-chip flex rounded-full p-1">
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
