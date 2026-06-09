import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { PWA_ENABLED } from "@/lib/pwa/config";

export const metadata: Metadata = {
  title: "AI Photo Studio · Zirolu.id",
  description: "Generate gambar AI dari Zirolu.id",
  ...(PWA_ENABLED
    ? {
        appleWebApp: {
          capable: true,
          statusBarStyle: "default" as const,
          title: "AI Photo",
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#e04585",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
