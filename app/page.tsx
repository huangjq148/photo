import { cookies } from "next/headers";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { getUserAlbums } from "@/lib/albums/library";
import { getUserPhotoCount, getRecentPhotos } from "@/lib/home/queries";
import { getMemoryDashboard } from "@/lib/memory/dashboard";
import { HomeHero } from "@/components/home/home-hero";
import { HomeMemorySpotlight } from "@/components/home/home-memory-spotlight";
import { HomeStats } from "@/components/home/home-stats";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { HomeRecentPhotos, HomeRecentPhotosSkeleton } from "@/components/home/home-recent-photos";

async function AuthenticatedContent({
  userId,
  storageUsed,
  storageLimit,
}: {
  userId: string;
  storageUsed: string;
  storageLimit: string;
}) {
  const [albums, photoCount, recentPhotos, dashboard] = await Promise.all([
    getUserAlbums(prisma, userId).catch(() => []),
    getUserPhotoCount(prisma, userId).catch(() => 0),
    getRecentPhotos(prisma, userId, 12).catch(() => []),
    getMemoryDashboard(prisma, userId).catch(() => ({
      onThisDay: { title: "今天的回忆", items: [] },
      childReports: [],
      annualHighlights: [],
    })),
  ]);

  return (
    <>
      <section>
        <HomeMemorySpotlight onThisDay={dashboard.onThisDay} />
      </section>

      <section>
        <HomeStats
          albumCount={albums.length}
          photoCount={photoCount}
          storageUsed={storageUsed}
          storageLimit={storageLimit}
        />
      </section>

      <section>
        <HomeQuickActions />
      </section>

      <section>
        <HomeRecentPhotos photos={recentPhotos} />
      </section>
    </>
  );
}

export default async function HomePage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  return (
    <main className="overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-12 lg:py-12">
      <div className="space-y-10 sm:space-y-14">
        <HomeHero user={user ? { nickname: user.nickname } : null} />

        {user ? (
          <Suspense fallback={<HomeRecentPhotosSkeleton />}>
            <AuthenticatedContent
              userId={user.id}
              storageUsed={user.storageUsed}
              storageLimit={user.storageLimit}
            />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}
