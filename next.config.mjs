/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,   // required for Vercel + custom domains sometimes
  },
};

export default nextConfig;
