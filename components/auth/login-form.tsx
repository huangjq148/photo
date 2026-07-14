"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { PasswordField } from "@/components/auth/password-field";

type FieldErrors = Record<string, string>;

function extractFieldErrors(issues: Array<{ path?: string; message: string }> | undefined): FieldErrors {
  const errors: FieldErrors = {};
  if (!Array.isArray(issues)) return errors;

  for (const issue of issues) {
    const path = issue.path ?? "_global";
    if (errors[path]) {
      errors[path] += "; " + issue.message;
    } else {
      errors[path] = issue.message;
    }
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setBusy(true);
    setGlobalError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        const fieldErrs = extractFieldErrors(json.issues);
        if (Object.keys(fieldErrs).length > 0) {
          const { _global, ...rest } = fieldErrs;
          setFieldErrors(rest);
          if (_global) setGlobalError(_global);
          else if (Object.keys(rest).length === 0) setGlobalError(json.error ?? "登录失败");
        } else {
          setGlobalError(json.error ?? "登录失败");
        }
        return;
      }

      router.push("/albums");
      router.refresh();
    } catch {
      setGlobalError("登录失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="login-email">
          邮箱
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          aria-invalid={!!fieldErrors.email}
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--film)]"
        />
        {fieldErrors.email ? (
          <p id="login-email-error" className="text-xs text-[var(--danger)]" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="login-password"
        name="password"
        label="密码"
        required
        autoComplete="current-password"
        error={fieldErrors.password}
      />

      {globalError ? (
        <p className="text-sm text-[var(--danger)]" aria-live="polite" role="alert">
          {globalError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-white px-6 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "登录中..." : "登录"}
      </button>

      <p className="text-sm text-[var(--muted)]">
        还没有账号？
        <Link className="ml-2 font-medium text-[var(--text)] underline" href="/register">
          去注册
        </Link>
      </p>
    </form>
  );
}
