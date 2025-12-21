import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply headers to all routes to allow embedding
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;", // Allow embedding from any origin
          },
        ],
      },
    ];
  },
};

export default nextConfig;
