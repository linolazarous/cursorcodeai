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
    // REMOVED: turbopack - this is a CLI flag, not a config option
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "@radix-ui/react-label", "class-variance-authority"],
  },

  // ────────────────────────────────────────────────
  // Monorepo: transpile shared packages
  // ────────────────────────────────────────────────
  transpilePackages: [
    "@cursorcode/ui",
    "@cursorcode/db",
    "@cursorcode/types",
  ],

  // ────────────────────────────────────────────────
  // Image optimization (remote patterns)
  // ────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cursorcode.app",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.vercel.app",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/**",
      },
    ],
    minimumCacheTTL: 60,
    formats: ["image/avif", "image/webp"],
  },

  // ────────────────────────────────────────────────
  // Security headers (CSP, HSTS, etc.)
  // ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
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
    ]
  },

  // ────────────────────────────────────────────────
  // Output: standalone for Docker/Vercel
  // ────────────────────────────────────────────────
  output: "standalone",

  // ────────────────────────────────────────────────
  // Redirects / rewrites
  // ────────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: "/old-path",
        destination: "/new-path",
        permanent: true,
      },
    ]
  },

  // ────────────────────────────────────────────────
  // Webpack configuration (optional)
  // ────────────────────────────────────────────────
  webpack(config, { isServer }) {
    // Bundle analyzer (optional)
    if (!isServer && process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("@next/bundle-analyzer")
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: false,
          reportFilename: "bundle-analysis.html",
        })
      )
    }
    return config
  },
}

export default nextConfig
