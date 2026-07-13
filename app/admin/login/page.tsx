import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";

export default async function AdminLoginPage() {
  const session = getCurrentAdminSessionFromCookieStore(await cookies(), getAppEnv().JWT_SECRET);
  if (session) {
    redirect("/admin/photos");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#08090c] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Admin access</p>
        <h1 className="mt-3 text-3xl font-black">管理员登录</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          请输入共享管理员密码，进入只读图片总览和文件管理后台。
        </p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
