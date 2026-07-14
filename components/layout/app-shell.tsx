"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Upload, Ellipsis, Star, Map, Copy, Trash2 } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useUpload } from "@/components/upload/upload-provider";

const mainNavItems = [
  { href: "/albums", label: "相册" },
  { href: "/timeline", label: "时间线" },
  { href: "/memory", label: "回忆" },
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

const moreMenuItems = [
  { key: "favorites", label: "收藏", icon: <Star size={16} aria-hidden="true" />, href: "/favorites" as Route },
  { key: "map", label: "地图", icon: <Map size={16} aria-hidden="true" />, href: "/map" as Route },
  { key: "duplicates", label: "重复", icon: <Copy size={16} aria-hidden="true" />, href: "/duplicates" as Route },
  { key: "trash", label: "回收站", icon: <Trash2 size={16} aria-hidden="true" />, href: "/trash" as Route },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { openUpload } = useUpload();
  const isHome = pathname === "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "more" dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;

    function handleClick(event: MouseEvent) {
      if (moreRef.current && event.target instanceof Node && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  // Close on Escape
  useEffect(() => {
    if (!moreOpen) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [moreOpen]);

  if (pathname.startsWith("/share/") || pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <div className={`${isHome ? "flex min-h-dvh flex-col overflow-x-hidden" : "min-h-dvh"} text-[var(--text)]`}>
      {/* Top header — simplified on mobile, full on desktop */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--border)] noir-glass-shell">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8 lg:py-3">
          {/* Logo */}
          <Link href="/" className="inline-flex shrink-0 items-baseline gap-3">
            <span className="text-base font-black uppercase text-[var(--text)]">
              Noir
            </span>
            <span className="hidden text-xs text-[var(--muted)] sm:block">
              photo archive
            </span>
          </Link>

          {/* Desktop nav: main items + more dropdown + upload */}
          <div className="hidden items-center gap-1 lg:flex lg:justify-self-center">
            <nav aria-label="主导航" className="flex items-center gap-1">
              {mainNavItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition duration-200 ${
                      active
                        ? "bg-[var(--accent)] text-black"
                        : "text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* More dropdown */}
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen(!moreOpen)}
                  aria-label="更多"
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition duration-200 ${
                    moreOpen || moreMenuItems.some((i) => pathname.startsWith(i.href))
                      ? "bg-[var(--accent)] text-black"
                      : "text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
                  }`}
                >
                  更多
                  <Ellipsis size={16} aria-hidden="true" />
                </button>

                {moreOpen && (
                  <div
                    role="menu"
                    aria-label="更多"
                    className="absolute left-0 top-11 z-30 min-w-36 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[rgba(10,10,12,0.94)] p-1.5 shadow-2xl backdrop-blur-xl"
                  >
                    {moreMenuItems.map((item) => {
                      const active = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          role="menuitem"
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMoreOpen(false)}
                          className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                            active
                              ? "bg-white/[0.12] text-[var(--text)]"
                              : "text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            <button
              type="button"
              onClick={() => openUpload()}
              className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
            >
              <Upload aria-hidden="true" size={16} />
              上传
            </button>
          </div>

          {/* Mobile header: show user menu on the right */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <UserMenu />
          </div>

          {/* Desktop user menu */}
          <div className="hidden lg:justify-self-end lg:block">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className={isHome ? "min-h-0 flex-1" : undefined}>{children}</div>

      {/* Mobile bottom navigation */}
      <MobileNavigation />
    </div>
  );
}
