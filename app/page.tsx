import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { HomeActions } from "@/components/home/home-actions";

export default async function HomePage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  // Fetch real stats when authenticated
  let totalMedia = 0;
  let totalAlbums = 0;
  let storageUsed = "0";

  if (user) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { storage_used: true },
      });

      const [mediaCount, albumCount] = await Promise.all([
        prisma.photo.count({
          where: {
            status: "normal",
            album: {
              members: { some: { user_id: user.id } },
            },
          },
        }),
        prisma.album.count({
          where: {
            members: { some: { user_id: user.id } },
          },
        }),
      ]);

      totalMedia = mediaCount;
      totalAlbums = albumCount;

      if (dbUser) {
        const gb = Number(dbUser.storage_used) / (1024 * 1024 * 1024);
        storageUsed = gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(Number(dbUser.storage_used) / (1024 * 1024))} MB`;
      }
    } catch {
      // Stats are best-effort; fall through to defaults
    }
  }

  const stats = [
    { label: "回忆", value: user ? String(totalMedia) : "—" },
    { label: "相册", value: user ? String(totalAlbums) : "—" },
    { label: "空间", value: user ? storageUsed : "—" },
  ];

  return (
    <main className="overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-12 lg:py-4">
      <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <p className="mb-4 text-sm font-medium tracking-[0.18em] text-[var(--film)]">FAMILY MEMORY</p>
          <h1 className="max-w-[10ch] text-5xl font-black leading-[0.92] text-[var(--text)] sm:max-w-4xl sm:text-7xl lg:text-8xl">
            家庭回忆
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
                MEMORY
                <br />
                SHARE
                <br />
                FAMILY
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
