import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";

export default async function AdminPage() {
  const session = getCurrentAdminSessionFromCookieStore(await cookies(), getAppEnv().JWT_SECRET);
  redirect(session ? "/admin/photos" : "/admin/login");
}
