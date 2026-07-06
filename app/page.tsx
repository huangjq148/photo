import { cookies } from "next/headers";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { HomeActions } from "@/components/home/home-actions";

const stats = [
  { label: "上传", value: "Ready" },
  { label: "相册", value: "Live" },
  { label: "回收", value: "On" }
];

export default async function HomePage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  return (
    <main className="h-full overflow-hidden px-5 sm:px-8 lg:px-12">
      <section className="mx-auto grid h-full min-h-0 max-w-7xl items-center gap-6 py-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-5 text-sm font-medium text-[var(--film)]">PHOTO ARCHIVE</p>
          <h1 className="max-w-4xl text-5xl font-black leading-none text-[var(--text)] sm:text-8xl lg:text-9xl">
            NOIR PHOTO
          </h1>
          <HomeActions isAuthenticated={Boolean(user)} />
        </div>

        <aside className="min-h-0 border-t border-[var(--border)] pt-4">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="mt-3 text-xl font-black text-[var(--text)]">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 aspect-[4/3] max-h-[42dvh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,#0b0b0b,#373737_45%,#050505)]">
            <div className="flex h-full items-end p-5">
              <p className="text-4xl font-black leading-none text-white sm:text-5xl">
                ARCHIVE
                <br />
                EDIT
                <br />
                SHARE
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
