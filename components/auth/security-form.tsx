"use client";

import { useState } from "react";
import { PasswordField } from "@/components/auth/password-field";

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    setGlobalSuccess(null);
    setFieldErrors({});

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "两次输入的新密码不一致" });
      return;
    }

    if (newPassword.length < 8) {
      setFieldErrors({ newPassword: "新密码长度必须至少为 8 个字符" });
      return;
    }

    setChanging(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Try mapping field-level issues
        if (Array.isArray(json.issues) && json.issues.length > 0) {
          const errs: Record<string, string> = {};
          for (const issue of json.issues) {
            const path = (issue as { path?: string; message: string }).path ?? "_global";
            errs[path] = (issue as { message: string }).message;
          }
          const { _global, ...rest } = errs;
          if (Object.keys(rest).length > 0) setFieldErrors(rest);
          if (_global) setGlobalError(_global);
          else setGlobalError(json.error ?? "修改失败");
        } else {
          setGlobalError(json.error ?? "修改失败");
        }
        return;
      }
      setGlobalSuccess("密码修改成功");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setGlobalError("修改失败，请稍后重试");
    } finally {
      setChanging(false);
    }
  }

  async function handleLogoutAll() {
    if (!confirm("确定要退出所有设备吗？当前设备也将被登出。")) return;
    setLoggingOut(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失败");
      window.location.href = "/login";
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "操作失败");
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <section>
        <h2 className="text-lg font-bold text-[var(--text)]">修改密码</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-md">
          <PasswordField
            id="security-current"
            value={currentPassword}
            label="当前密码"
            required
            autoComplete="current-password"
            onChange={setCurrentPassword}
            error={fieldErrors.currentPassword}
          />

          <PasswordField
            id="security-new"
            value={newPassword}
            label="新密码"
            required
            autoComplete="new-password"
            minLength={8}
            onChange={setNewPassword}
            error={fieldErrors.newPassword}
          />

          <PasswordField
            id="security-confirm"
            value={confirmPassword}
            label="确认新密码"
            required
            autoComplete="new-password"
            onChange={setConfirmPassword}
            error={fieldErrors.confirmPassword}
          />

          <button
            type="submit"
            disabled={changing}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changing ? "修改中..." : "修改密码"}
          </button>
        </form>
      </section>

      {/* Logout All */}
      <section className="rounded-xl border border-red-400/25 bg-red-950/20 p-4 max-w-md">
        <h2 className="text-lg font-bold text-[var(--danger)]">退出所有设备</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          将使你的所有设备上的登录状态失效，包括当前设备。
        </p>
        <button
          type="button"
          onClick={() => { void handleLogoutAll(); }}
          disabled={loggingOut}
          className="mt-3 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--danger)] px-5 text-sm font-bold text-black transition hover:opacity-85 disabled:opacity-50"
        >
          {loggingOut ? "处理中..." : "退出所有设备"}
        </button>
      </section>

      {globalSuccess ? (
        <p className="text-sm text-green-400" role="status">
          {globalSuccess}
        </p>
      ) : null}

      {globalError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {globalError}
        </p>
      ) : null}
    </div>
  );
}
