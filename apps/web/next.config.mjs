import path from "path";
import { fileURLToPath } from "url";

/**
 * Fix __dirname in ES module scope
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ────────────────────────────────────────────────
  // Basic settings
  // ────────────────────────────────────────────────
  reactStrictMode: true,
  swcMinify: true,

  // ────────────────────────────────────────────────
  // Experimental features
  // ────────────────────────────────────────────────
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-label",
      "class-variance-authority",
    ],
  },

  // ────────────────────────────────────────────────
  // Monorepo support
  // ────────────────────────────────────────────────
  transpilePackages: [
    "@cursorcode/ui",
    "@cursorcode/db",
    "@cursorcode/types",
  ],

  // ✅ FIXED dirname usage
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // ────────────────────────────────────────────────
  // Images
  // ────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cursorcode.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.vercel.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
    minimumCacheTTL: 60,
    formats: ["image/avif", "image/webp"],
  },

  // ────────────────────────────────────────────────
  // Security headers
  // ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value:
              "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://*.cursorcode.app",
              "connect-src 'self' https://api.x.ai https://api.stripe.com https://*.cursorcode.app https://cursorcode-ai.onrender.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ────────────────────────────────────────────────
  // Output standalone
  // ────────────────────────────────────────────────
  output: "standalone",

  async redirects() {
    return [];
  },

  webpack(config, { isServer }) {
    if (!isServer && process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("@next/bundle-analyzer");

      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: false,
          reportFilename: "bundle-analysis.html",
        })
      );
    }

    return config;
  },
};

export default nextConfig;
