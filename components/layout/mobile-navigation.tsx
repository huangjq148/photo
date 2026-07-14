"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Clock,
  Upload,
  Sparkles,
  Ellipsis,
  Star,
  Map,
  Copy,
  Trash2,
  Shield,
  LogOut,
  X,
} from "lucide-react";
import { useUpload } from "@/components/upload/upload-provider";

type MoreDrawerItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href?: Route;
  onClick?: () => void;
  tone?: "default" | "danger";
};

type MainTab =
  | { key: "albums" | "timeline" | "memory"; label: string; icon: React.ElementType; href: Route; isAction?: undefined; isMore?: undefined }
  | { key: "upload"; label: string; icon: React.ElementType; isAction: true; href?: undefined; isMore?: undefined }
  | { key: "more"; label: string; icon: React.ElementType; isMore: true; href?: undefined; isAction?: undefined };

const mainTabs: MainTab[] = [
  { key: "albums", label: "相册", icon: LayoutGrid, href: "/albums" as Route },
  { key: "timeline", label: "时间线", icon: Clock, href: "/timeline" as Route },
  { key: "upload", label: "上传", icon: Upload, isAction: true },
  { key: "memory", label: "回忆", icon: Sparkles, href: "/memory" as Route },
  { key: "more", label: "更多", icon: Ellipsis, isMore: true },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { openUpload } = useUpload();
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on outside click
  useEffect(() => {
    if (!moreOpen) return;

    function handleClick(event: MouseEvent) {
      if (
        drawerRef.current &&
        event.target instanceof Node &&
        !drawerRef.current.contains(event.target)
      ) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (moreOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [moreOpen]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const moreItems: MoreDrawerItem[] = [
    { key: "favorites", label: "收藏", icon: <Star size={20} />, href: "/favorites" },
    { key: "map", label: "地图", icon: <Map size={20} />, href: "/map" },
    { key: "duplicates", label: "重复", icon: <Copy size={20} />, href: "/duplicates" },
    { key: "trash", label: "回收站", icon: <Trash2 size={20} />, href: "/trash" },
    { key: "security", label: "安全", icon: <Shield size={20} />, href: "/account/security" },
    {
      key: "logout",
      label: loggingOut ? "退出中…" : logoutError ? "退出失败，重试" : "退出",
      icon: <LogOut size={20} />,
      onClick: handleLogout,
      tone: "danger" as const,
    },
  ];

  function getTabActive(tabKey: string): boolean {
    if (tabKey === "albums" && (pathname === "/" || pathname.startsWith("/albums"))) return true;
    if (tabKey === "timeline" && pathname.startsWith("/timeline")) return true;
    if (tabKey === "memory" && pathname.startsWith("/memory")) return true;
    return false;
  }

  return (
    <>
      <nav
        aria-label="底部导航"
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[rgba(10,10,12,0.88)] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-xl lg:hidden"
      >
        {mainTabs.map((tab) => {
          const active = getTabActive(tab.key);
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => openUpload()}
                aria-label={tab.label}
                className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-medium text-[var(--muted)] transition active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-black">
                  <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          }

          if (tab.isMore) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-label={tab.label}
                aria-expanded={moreOpen}
                className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-medium transition active:scale-95 ${
                  moreOpen ? "text-[var(--text)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          }

          // Regular link tabs
          return (
            <Link
              key={tab.key}
              href={tab.href!}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-medium transition active:scale-95 ${
                active ? "text-[var(--text)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* More Drawer Overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden">
          <div
            ref={drawerRef}
            role="dialog"
            aria-label="更多"
            aria-modal="true"
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-[var(--border-strong)] bg-[var(--surface)] pb-[max(env(safe-area-inset-bottom),1rem)] pt-1"
          >
            {/* Handle */}
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-[var(--border-strong)]" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-2">
              <h2 className="text-base font-bold text-[var(--text)]">更多</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="关闭更多"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="grid grid-cols-3 gap-3 px-4 py-3">
              {moreItems.map((item) => {
                const isActive = item.href ? pathname.startsWith(item.href) : false;
                const content = (
                  <div
                    className={`flex flex-col items-center gap-2 rounded-xl px-2 py-3 transition active:scale-95 ${
                      isActive ? "bg-[var(--accent-soft)] text-[var(--text)]" : "text-[var(--muted)] hover:bg-white/[0.06] hover:text-[var(--text)]"
                    } ${item.tone === "danger" ? "hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]" : ""}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={loggingOut}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                    }}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from being hidden behind the bottom nav */}
      <div className="h-[4.5rem] lg:hidden" aria-hidden="true" />
    </>
  );
}
