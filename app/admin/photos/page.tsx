import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPhotoTable } from "@/components/admin/admin-photo-table";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { listAdminPhotos } from "@/lib/admin/photos";

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = getCurrentAdminSessionFromCookieStore(await cookies(), getAppEnv().JWT_SECRET);
  if (!session) {
    redirect("/admin/login");
  }

  const resolvedSearchParams = await searchParams;

  const data = await listAdminPhotos(prisma, {
    keyword: pickString(resolvedSearchParams.keyword) ?? undefined,
    page: Number(pickString(resolvedSearchParams.page) ?? "1"),
    pageSize: Number(pickString(resolvedSearchParams.pageSize) ?? "20"),
    sortBy: (pickString(resolvedSearchParams.sortBy) as "uploadedAt" | "photoName" | "referenceCount" | undefined) ?? undefined,
    sortOrder: (pickString(resolvedSearchParams.sortOrder) as "asc" | "desc" | undefined) ?? undefined,
  });

  return (
    <AdminShell>
      <AdminPhotoTable
        items={data.items}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </AdminShell>
  );
}
