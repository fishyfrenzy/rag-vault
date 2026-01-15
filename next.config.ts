import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ohszdlpoinwclfexognm.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Optimize for common card sizes
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [128, 192, 256, 384],
    // Formats for better compression
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;

