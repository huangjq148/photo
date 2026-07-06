import { RegisterForm } from "@/components/auth/register-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirects";

export default async function RegisterPage() {
  const redirectPath = getAuthenticatedRedirectPath(Boolean(await getCurrentUserFromCookieStore(await cookies())));

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div>
            <p className="text-sm font-medium text-[var(--film)]">JOIN</p>
            <h1 className="mt-3 text-4xl font-black leading-none text-[var(--text)]">
              创建账号
            </h1>
          </div>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
