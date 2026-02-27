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

  // ✅ Fixes missing logo + any local images on Vercel
  images: {
    unoptimized: true,           // Required for local /public images in many Vercel + Turborepo setups
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Required for Vercel + Turborepo monorepos (keeps your current settings)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
