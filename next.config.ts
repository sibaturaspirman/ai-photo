import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Note: this helps Next.js internal limits, but Vercel still enforces
    // platform-level body limits for Serverless Functions.
    serverActions: {
      bodySizeLimit: "20mb",
    },
    proxyClientMaxBodySize: "20mb",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "*.fal.media" },
      { protocol: "https", hostname: "v3.fal.media" },
      { protocol: "https", hostname: "v2.fal.media" },
    ],
  },
};

export default nextConfig;
