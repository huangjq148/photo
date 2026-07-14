import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MessageProvider } from "@/components/ui/message";
import { UploadProvider } from "@/components/upload/upload-provider";
import "./globals.css";

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <MessageProvider>
          <UploadProvider>
            <AppShell>{children}</AppShell>
          </UploadProvider>
        </MessageProvider>
      </body>
    </html>
  );
}
