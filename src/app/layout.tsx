// Needed for Next.js App Router
import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
