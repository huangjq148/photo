"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";

type InvitationAcceptanceProps = {
  token: string;
  albumName: string;
  inviterName: string;
  maskedEmail: string;
  status: string;
  expiredAt: string;
};

export function InvitationAcceptance({
  token,
  albumName,
  inviterName,
  maskedEmail,
  status,
  expiredAt,
}: InvitationAcceptanceProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const isExpired = new Date(expiredAt).getTime() < Date.now();
  const isInvalid = status !== "pending" || isExpired;

  async function handleAccept() {
    setAccepting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/album-invites/${token}/accept`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "接受邀请失败");
      }
      setAccepted(true);
      setFeedback("已加入相册！");
      // Redirect to the album after a short delay
      setTimeout(() => {
        router.push(`/albums/${json.data.albumId}`);
      }, 1500);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "接受邀请失败");
    } finally {
      setAccepting(false);
    }
  }

  if (accepted) {
    return (
      <section className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 text-center">
        <CheckCircle size={48} className="mx-auto text-green-400" />
        <h1 className="mt-4 text-2xl font-black text-[var(--text)]">已加入相册</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">正在跳转到相册...</p>
      </section>
    );
  }

  if (isInvalid) {
    return (
      <section className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 text-center">
        <XCircle size={48} className="mx-auto text-red-400" />
        <h1 className="mt-4 text-2xl font-black text-[var(--text)]">邀请已失效</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {isExpired ? "此邀请已过期" : "此邀请已被撤销或已使用"}
        </p>
      </section>
    );
  }

  return (
    <section className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <div className="text-center">
        <h1 className="text-2xl font-black text-[var(--text)]">相册邀请</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {inviterName} 邀请你加入相册
        </p>
        <p className="mt-1 text-xl font-bold text-[var(--text)]">{albumName}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          目标邮箱：{maskedEmail}
        </p>
        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-[var(--muted)]">
          <Clock size={12} />
          <span>
            {(() => {
              const d = new Date(expiredAt);
              return `有效期至 ${d.toLocaleDateString("zh-CN")}`;
            })()}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {accepting ? "加入中..." : "接受邀请并加入相册"}
        </button>

        <p className="text-center text-xs text-[var(--muted)]">
          需要先登录与邀请邮箱一致的账号
        </p>
      </div>

      {feedback ? (
        <p className="mt-4 text-center text-sm text-[var(--danger)]" role="alert">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
