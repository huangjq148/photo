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
    <main className="overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-12 lg:py-4">
      <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <p className="mb-4 text-sm font-medium tracking-[0.18em] text-[var(--film)]">PHOTO ARCHIVE</p>
          <h1 className="max-w-[10ch] text-5xl font-black leading-[0.92] text-[var(--text)] sm:max-w-4xl sm:text-7xl lg:text-8xl">
            NOIR PHOTO
          </h1>
          <HomeActions isAuthenticated={Boolean(user)} />
        </div>

        <aside className="min-w-0 border-t border-[var(--border)] pt-4 lg:pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="mt-3 text-lg font-black text-[var(--text)] sm:text-xl">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 aspect-[4/3] min-h-[18rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,#0b0b0b,#373737_45%,#050505)]">
            <div className="flex h-full items-end p-5 sm:p-6">
              <p className="text-3xl font-black leading-none text-white sm:text-5xl">
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
