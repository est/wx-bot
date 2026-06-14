// Needed for Next.js App Router
import type { Metadata } from "next";
import "./globals.css";
import NpmBanner from "@/components/NpmBanner";

export const metadata: Metadata = {
  title: "wx-bot",
  description: "WeChat bot management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">
        <div className="flex-1">{children}</div>
        <NpmBanner />
      </body>
    </html>
  );
}
