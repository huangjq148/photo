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
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
