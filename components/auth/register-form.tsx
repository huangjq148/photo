"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          confirmPassword: String(form.get("confirmPassword") ?? ""),
          nickname: String(form.get("nickname") ?? "")
        })
      });

      const json = await response.json();
      if (!response.ok) {
        if (Array.isArray(json.issues) && json.issues.length > 0) {
          const messages = json.issues.map((i: { message: string }) => i.message).join("; ");
          throw new Error(messages);
        }
        throw new Error(json.error ?? "注册失败");
      }

      router.push("/albums");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="register-nickname">
          昵称
        </label>
        <input
          id="register-nickname"
          name="nickname"
          type="text"
          required
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none transition focus:border-[var(--film)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="register-email">
          邮箱
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none transition focus:border-[var(--film)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="register-password">
          密码
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          required
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none transition focus:border-[var(--film)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="register-confirmPassword">
          确认密码
        </label>
        <input
          id="register-confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none transition focus:border-[var(--film)]"
        />
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger)]" aria-live="polite">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-white px-6 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "注册中..." : "创建账号"}
      </button>

      <p className="text-sm text-[var(--muted)]">
        已有账号？
        <Link className="ml-2 font-medium text-[var(--text)] underline" href="/login">
          去登录
        </Link>
      </p>
    </form>
  );
}
