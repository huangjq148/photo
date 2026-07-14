"use client";

import React, {
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";

export type MenuItemTone = "default" | "accent" | "danger";

export type MenuOption = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  tone?: MenuItemTone;
  disabled?: boolean;
  hidden?: boolean;
  onSelect?: () => void | Promise<void>;
};

export type MenuController = {
  get isOpen(): boolean;
  get activeIndex(): number;
  get focusTarget(): "trigger" | "item" | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  handleTriggerKeyDown: (key: string) => void;
  handleMenuKeyDown: (key: string) => void;
};

function createCyclingIndex(current: number, delta: number, count: number) {
  if (count <= 0) {
    return -1;
  }

  return (current + delta + count) % count;
}

export function createMenuController(itemCount: number, initialOpen = false): MenuController {
  let open = initialOpen;
  let activeIndex = initialOpen && itemCount > 0 ? 0 : -1;
  let focusTarget: "trigger" | "item" | null = initialOpen ? "item" : "trigger";

  function openMenu() {
    open = true;
    activeIndex = itemCount > 0 ? 0 : -1;
    focusTarget = itemCount > 0 ? "item" : "trigger";
  }

  function closeMenu() {
    open = false;
    focusTarget = "trigger";
  }

  function move(delta: number) {
    if (!open) {
      return;
    }

    activeIndex = createCyclingIndex(activeIndex < 0 ? 0 : activeIndex, delta, itemCount);
    focusTarget = "item";
  }

  return {
    get isOpen() {
      return open;
    },
    get activeIndex() {
      return activeIndex;
    },
    get focusTarget() {
      return focusTarget;
    },
    open: openMenu,
    close: closeMenu,
    toggle() {
      if (open) {
        closeMenu();
        return;
      }

      openMenu();
    },
    handleTriggerKeyDown(key: string) {
      if (key === "Enter" || key === " " || key === "ArrowDown") {
        openMenu();
      }
    },
    handleMenuKeyDown(key: string) {
      if (!open) {
        return;
      }

      if (key === "ArrowDown") {
        move(1);
        return;
      }

      if (key === "ArrowUp") {
        move(-1);
        return;
      }

      if (key === "Escape") {
        closeMenu();
      }
    },
  };
}

type MenuItemProps = {
  active?: boolean;
  disabled?: boolean;
  tone?: MenuItemTone;
  icon?: ReactNode;
  className?: string;
  onSelect?: () => void | Promise<void>;
  children: ReactNode;
};

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { active = false, disabled = false, tone = "default", icon, className, onSelect, children },
  ref,
) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--danger)]"
      : tone === "accent"
        ? "text-[var(--film)]"
        : "text-[var(--text)]";

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (disabled) {
          return;
        }

        void onSelect?.();
      }}
      className={clsx(
        "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--film)]/70 disabled:cursor-not-allowed disabled:opacity-45",
        toneClass,
        active ? "bg-white/[0.12]" : "hover:bg-white/[0.1]",
        className,
      )}
    >
      {icon ? <span className="shrink-0" aria-hidden="true">{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
});

type MenuProps = {
  label: string;
  triggerContent: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  items?: MenuOption[];
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  title?: string;
  triggerRef?: RefObject<HTMLButtonElement>;
};

export function Menu({
  label,
  triggerContent,
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  items,
  className,
  triggerClassName,
  menuClassName,
  align = "right",
  title,
  triggerRef,
}: MenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const internalTriggerRef = useRef<HTMLButtonElement>(null);
  const buttonRef = triggerRef ?? internalTriggerRef;
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [activeIndex, setActiveIndex] = useState(0);

  const isOpen = open ?? uncontrolledOpen;
  const visibleItems = useMemo(() => items?.filter((item) => !item.hidden) ?? [], [items]);
  const menuContent =
    items && items.length > 0
      ? items.filter((item) => !item.hidden).map((item, index) => (
          <MenuItem
            key={item.key}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            active={index === activeIndex}
            disabled={item.disabled}
            tone={item.tone}
            icon={item.icon}
            className={item.tone === "accent" ? "text-[var(--film)]" : undefined}
            onSelect={() => {
              setOpen(false);
              window.requestAnimationFrame(() => {
                buttonRef.current?.focus();
              });
              void item.onSelect?.();
            }}
          >
            {item.label}
          </MenuItem>
        ))
      : children;

  function setOpen(next: boolean) {
    if (open === undefined) {
      setUncontrolledOpen(next);
    }

    onOpenChange?.(next);
  }

  function closeMenu() {
    setOpen(false);
    window.requestAnimationFrame(() => {
      buttonRef.current?.focus();
    });
  }

  function openMenu() {
    if (visibleItems.length > 0) {
      setActiveIndex(0);
    }

    setOpen(true);
    window.requestAnimationFrame(() => {
      itemRefs.current[0]?.focus();
    });
  }

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
      return;
    }

    if (visibleItems.length === 0) {
      return;
    }

    setActiveIndex((current) => Math.min(current, visibleItems.length - 1));
  }, [isOpen, visibleItems.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      if (event.target instanceof Node && root.contains(event.target)) {
        return;
      }

      setOpen(false);
      window.requestAnimationFrame(() => {
        buttonRef.current?.focus();
      });
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [buttonRef, isOpen]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (visibleItems.length === 0) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        const nextIndex =
          event.key === "ArrowDown"
            ? createCyclingIndex(current, 1, visibleItems.length)
            : createCyclingIndex(current, -1, visibleItems.length);

        window.requestAnimationFrame(() => {
          itemRefs.current[nextIndex]?.focus();
        });

        return nextIndex;
      });
    }
  }

  return (
    <div ref={rootRef} className={clsx("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (isOpen) {
            closeMenu();
            return;
          }

          openMenu();
        }}
        onKeyDown={handleTriggerKeyDown}
        className={clsx(
          "inline-flex h-11 w-11 items-center justify-center rounded-full noir-glass-chip text-white transition hover:border-[var(--border-strong)]",
          triggerClassName,
        )}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        title={title ?? label}
      >
        {triggerContent}
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          className={clsx(
            "absolute top-12 z-30 min-w-44 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[rgba(10,10,12,0.92)] p-1.5 shadow-2xl backdrop-blur-xl",
            align === "right" ? "right-0" : "left-0",
            menuClassName,
          )}
        >
          {menuContent}
        </div>
      ) : null}
    </div>
  );
}
