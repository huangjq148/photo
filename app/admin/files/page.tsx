import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { basename, resolve } from "node:path";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminFileTable } from "@/components/admin/admin-file-table";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { listAdminFiles } from "@/lib/admin/files";

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = getCurrentAdminSessionFromCookieStore(await cookies(), getAppEnv().JWT_SECRET);
  if (!session) {
    redirect("/admin/login");
  }

  const resolvedSearchParams = await searchParams;
  const dataRoot = resolve(getAppEnv().STORAGE_ROOT, "..");
  const storageRootName = basename(getAppEnv().STORAGE_ROOT);
  const data = await listAdminFiles(prisma, dataRoot, {
    keyword: pickString(resolvedSearchParams.keyword) ?? undefined,
    page: Number(pickString(resolvedSearchParams.page) ?? "1"),
    pageSize: Number(pickString(resolvedSearchParams.pageSize) ?? "20"),
    sortBy: (pickString(resolvedSearchParams.sortBy) as "fileName" | "relativePath" | "size" | "referenceCount" | "lastModifiedAt" | undefined) ?? undefined,
    sortOrder: (pickString(resolvedSearchParams.sortOrder) as "asc" | "desc" | undefined) ?? undefined,
  }, storageRootName);

  return (
    <AdminShell>
      <AdminFileTable
        items={data.items}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </AdminShell>
  );
}
