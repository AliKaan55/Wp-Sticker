import "./globals.css";
import type { Metadata, Viewport } from "next";

// App Router requires every page to sit under a root layout — this was
// missing from the project entirely (none of the files the project
// contained defined one), which makes `next build` fail outright with
// "page.tsx doesn't have a root layout", even though `next dev` can mask it
// in some setups. Kept intentionally minimal: it just provides the <html>/
// <body> shell, global styles and metadata that `app/manifest.ts` already
// describes.
export const metadata: Metadata = {
  title: "WhatsApp Çıkartma Dönüştürücü",
  description:
    "JPG, PNG ve WEBP görsellerini WhatsApp çıkartmasına veya yeniden boyutlandırılmış PNG görsele dönüştürün.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS Safari doesn't fully honor the web manifest for "Add to Home
  // Screen" (no install prompt, standalone mode needs this meta tag, and
  // the status bar style is iOS-specific), so these are kept alongside the
  // manifest rather than instead of it.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Çıkartma",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
