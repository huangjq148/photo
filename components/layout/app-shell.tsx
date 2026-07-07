"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/layout/user-menu";

const navItems = [
  { href: "/memories", label: "家庭回忆流" },
  { href: "/timeline", label: "回忆时间线" },
  { href: "/albums", label: "家庭相册" },
  { href: "/favorites", label: "收藏精选" },
  { href: "/trash", label: "回收站" },
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (pathname.startsWith("/share/")) {
    return <>{children}</>;
  }

  return (
    <div className={`${isHome ? "flex min-h-dvh flex-col overflow-x-hidden" : "min-h-dvh"} bg-[var(--background)] text-[var(--text)]`}>
      <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--border)] bg-black/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-8">
          <Link href="/" className="inline-flex items-baseline gap-3 self-start">
            <span className="text-base font-black uppercase text-[var(--text)]">
              Noir
            </span>
            <span className="hidden text-xs text-[var(--muted)] sm:block">
              photo archive
            </span>
          </Link>
          <div className="flex items-center gap-2 min-w-0 lg:justify-self-center">
            <nav
              aria-label="主导航"
              className="flex h-[50px] min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 lg:justify-self-center lg:h-auto"
            >
              {navItems.map((item) => {
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
            </nav>
            <div className="shrink-0 lg:hidden">
              <UserMenu />
            </div>
          </div>
          <div className="hidden lg:justify-self-end lg:block">
            <UserMenu />
          </div>
        </div>
      </header>
      <div className={isHome ? "min-h-0 flex-1" : undefined}>{children}</div>
    </div>
  );
}
