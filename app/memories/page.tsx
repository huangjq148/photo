import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { MemoriesClient } from "./memories-client";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  if (!user) {
    notFound();
  }

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-[var(--text)] sm:text-3xl">家庭回忆流</h1>
          <a
            href="/albums"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black transition hover:bg-white"
          >
            上传回忆
          </a>
        </div>
        <MemoriesClient />
      </div>
    </main>
  );
}
