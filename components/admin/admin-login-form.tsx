"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "登录失败，请重试");
      }

      router.push("/admin/photos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
      passwordRef.current?.select();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70" htmlFor="admin-password">
          管理员密码
        </label>
        <input
          ref={passwordRef}
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={busy}
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-white/35 disabled:opacity-50"
        />
      </div>

      {error ? (
        <p className="text-sm text-[#ff7b7b]" aria-live="polite">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-6 font-bold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
