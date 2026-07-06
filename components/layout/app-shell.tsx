"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/layout/user-menu";

const navItems = [
  { href: "/albums", label: "相册" },
  { href: "/trash", label: "回收站" },
  { href: "/favorites", label: "收藏" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (pathname.startsWith("/share/")) {
    return <>{children}</>;
  }

  return (
    <div className={`${isHome ? "flex h-dvh flex-col overflow-hidden" : "min-h-dvh"} bg-[var(--background)] text-[var(--text)]`}>
      <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--border)] bg-black/86 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
          <Link href="/" className="inline-flex items-baseline gap-3 self-start">
            <span className="text-base font-black uppercase text-[var(--text)]">
              Noir
            </span>
            <span className="hidden text-xs text-[var(--muted)] sm:block">
              photo archive
            </span>
          </Link>
          <nav
            aria-label="主导航"
            className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 lg:justify-self-center"
          >
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
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
          <div className="lg:justify-self-end">
            <UserMenu />
          </div>
        </div>
      </header>
      <div className={isHome ? "min-h-0 flex-1 overflow-hidden" : undefined}>{children}</div>
    </div>
  );
}
