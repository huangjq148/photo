import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { listAdminUsers } from "@/lib/admin/users";

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = getCurrentAdminSessionFromCookieStore(await cookies(), getAppEnv().JWT_SECRET);
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const data = await listAdminUsers(prisma, {
    keyword: pickString(params.keyword) ?? undefined,
    page: Number(pickString(params.page) ?? "1"),
    pageSize: Number(pickString(params.pageSize) ?? "20"),
    sortBy: (pickString(params.sortBy) as "createdAt" | "storageUsed" | "uploads" | undefined) ?? undefined,
    sortOrder: (pickString(params.sortOrder) as "asc" | "desc" | undefined) ?? undefined,
  });

  return (
    <AdminShell>
      <AdminUserTable items={data.items} page={data.page} pageSize={data.pageSize} total={data.total} />
    </AdminShell>
  );
}
