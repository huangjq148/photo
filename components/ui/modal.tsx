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
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const stopScrollPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (!open) return;

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    const focusables = getFocusableElements(dialogRef.current);
    const autofocusTarget =
      dialogRef.current?.querySelector<HTMLElement>("[data-modal-body]") ??
      dialogRef.current?.querySelector<HTMLElement>("[autofocus]") ??
      focusables[0] ??
      dialogRef.current;
    autofocusTarget?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      setActiveIndex(focusables.findIndex((element) => element === autofocusTarget));
    });

    const backdropEl = backdropRef.current;
    const stopBackdropScroll = (event: WheelEvent | TouchEvent) => {
      if (event.target === backdropEl) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    backdropEl?.addEventListener("wheel", stopBackdropScroll, { capture: true, passive: false });
    backdropEl?.addEventListener("touchmove", stopBackdropScroll, { capture: true, passive: false });

    return () => {
      backdropEl?.removeEventListener("wheel", stopBackdropScroll, true);
      backdropEl?.removeEventListener("touchmove", stopBackdropScroll, true);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      window.requestAnimationFrame(() => {
        previousActiveElementRef.current?.focus();
      });
      previousActiveElementRef.current = null;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onWheelCapture={(event) => {
        event.stopPropagation();
      }}
      onWheel={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onTouchMoveCapture={(event) => {
        event.stopPropagation();
      }}
      onTouchMove={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
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
          "max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl",
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
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
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

        <div
          data-modal-body
          tabIndex={-1}
          className="max-h-[calc(100dvh-env(safe-area-inset-top)-9rem)] overflow-y-auto overscroll-contain px-4 py-5 sm:max-h-[calc(90dvh-145px)] sm:p-6"
          onWheelCapture={stopScrollPropagation}
          onTouchMoveCapture={stopScrollPropagation}
        >
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--border)] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
