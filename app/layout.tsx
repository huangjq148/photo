import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MessageProvider } from "@/components/ui/message";
import { UploadProvider } from "@/components/upload/upload-provider";
import "./globals.css";

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MessageProvider>
      <UploadProvider>{children}</UploadProvider>
    </MessageProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-black"
        >
          跳到主内容
        </a>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
