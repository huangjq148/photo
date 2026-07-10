"use client";

import { useState } from "react";

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "两次输入的新密码不一致" });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({ type: "error", text: "新密码长度必须至少为 8 个字符" });
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
      if (!res.ok) throw new Error(json.error ?? "修改失败");
      setFeedback({ type: "success", text: "密码修改成功" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "修改失败" });
    } finally {
      setChanging(false);
    }
  }

  async function handleLogoutAll() {
    if (!confirm("确定要退出所有设备吗？当前设备也将被登出。")) return;
    setLoggingOut(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "操作失败");
      // Redirect to login after logout
      window.location.href = "/login";
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "操作失败" });
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <section>
        <h2 className="text-lg font-bold text-[var(--text)]">修改密码</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-md">
          <label className="block">
            <span className="text-sm font-medium text-[var(--muted-strong)]">当前密码</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none focus:border-[var(--film)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--muted-strong)]">新密码</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none focus:border-[var(--film)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--muted-strong)]">确认新密码</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none focus:border-[var(--film)]"
            />
          </label>
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

      {feedback ? (
        <p
          className={`text-sm ${feedback.type === "success" ? "text-green-400" : "text-[var(--danger)]"}`}
          role="alert"
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
