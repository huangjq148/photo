import { LoginForm } from "@/components/auth/login-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirects";

export default async function LoginPage() {
  const redirectPath = getAuthenticatedRedirectPath(Boolean(await getCurrentUserFromCookieStore(await cookies())));

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl items-center justify-center sm:min-h-[calc(100dvh-5rem)]">
        <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8">
          <div>
            <p className="text-sm font-medium text-[var(--film)]">SIGN IN</p>
            <h1 className="mt-3 text-4xl font-black leading-none text-[var(--text)]">
              登录
            </h1>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
