"use client";

import React from "react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { getFocusableElements, handleModalKeyDown } from "@/hooks/use-focus-trap";

type ModalSize = "sm" | "md" | "lg" | "xl";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  onClose: () => void;
};

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  size = "md",
  onClose,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open) return;

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = getFocusableElements(dialogRef.current);
    const autofocusTarget =
      dialogRef.current?.querySelector<HTMLElement>("[autofocus]") ?? focusables[0] ?? dialogRef.current;
    window.requestAnimationFrame(() => {
      autofocusTarget?.focus();
      setActiveIndex(focusables.findIndex((element) => element === autofocusTarget));
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => {
        previousActiveElementRef.current?.focus();
      });
      previousActiveElementRef.current = null;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={clsx(
          "max-h-[90dvh] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl",
          sizeClass[size],
        )}
        onKeyDown={(event) => {
          const nextFocusables = getFocusableElements(dialogRef.current);
          const currentFocus = document.activeElement as HTMLElement | null;
          const currentIndex = currentFocus ? nextFocusables.indexOf(currentFocus) : activeIndex;
          const nextIndex = handleModalKeyDown(
            event,
            nextFocusables,
            currentIndex,
            onClose,
            dialogRef.current,
          );

          if (event.key === "Tab") {
            setActiveIndex(nextIndex);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-[var(--text)]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-[var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹框"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text)] transition hover:bg-white/[0.08]"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90dvh - 145px)" }}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--border)] px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
