import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { SecurityForm } from "@/components/auth/security-form";

export default async function SecurityPage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  if (!user) {
    redirect("/login?next=/account/security");
  }

  return (
    <main className="px-4 pb-8 pt-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-black text-[var(--text)] sm:text-3xl">账号安全</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          登录账号：{user.email}
        </p>
        <div className="mt-8">
          <SecurityForm />
        </div>
      </div>
    </main>
  );
}
