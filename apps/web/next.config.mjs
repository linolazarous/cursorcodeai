// apps/web/next.config.mjs
import path from "path";
import { fileURLToPath } from "url";

/**
 * Fix for __dirname in ES Modules (Next.js 15 uses ESM)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  transpilePackages: [
    "@cursorcode/ui",
    "@cursorcode/types",
    "@cursorcode/db",
  ],

  // Fixes missing logo + local images on Vercel
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Explicit webpack alias for @/ (required in Turborepo/Next.js 15)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },

  // Monorepo settings
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
