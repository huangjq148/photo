import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MessageProvider } from "@/components/ui/message";
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
          <AppShell>{children}</AppShell>
        </MessageProvider>
      </body>
    </html>
  );
}
