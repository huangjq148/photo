import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { TimelineClient } from "./timeline-client";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  if (!user) {
    notFound();
  }

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[var(--text)] sm:text-3xl">回忆时间线</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">按年份浏览家庭的每一段记忆。</p>
        </div>
        <TimelineClient />
      </div>
    </main>
  );
}
