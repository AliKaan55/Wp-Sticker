
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Güncellendi: experimental'dan çıkarıldı
  serverExternalPackages: ["sharp", "ffmpeg-static"],
  // Lockfile uyarısını sustur (kendi klasörünün yolunu kullan)
  outputFileTracingRoot: __dirname,
};

export default withPWA(nextConfig);

