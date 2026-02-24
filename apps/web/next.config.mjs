import path from "path";
import { fileURLToPath } from "url";

/**
 * Fix __dirname in ES module scope
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {

  reactStrictMode: true,

  /**
   * ✅ REQUIRED for Next.js 16
   * Fixes Turbopack + webpack conflict
   */
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "../../packages/ui"),
    },
  },

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

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  /**
   * ✅ Keep webpack for backward compatibility
   * Turbopack will ignore it, webpack will use it if needed
   */
  webpack: (config) => {

    config.resolve.alias["@"] = path.resolve(
      __dirname,
      "../../packages/ui"
    );

    return config;
  },

};

export default nextConfig;
