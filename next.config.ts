import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // Allow Server Actions from any local network IP in development.
      // Without this, Next.js 16's CSRF check rejects actions from
      // non-localhost origins (phones, other laptops on the same network).
      ...(process.env.NODE_ENV === "development" && {
        allowedOrigins: [
          "localhost:3000",
          "192.168.70.91:3000", // Mac's local IP — update if network changes
          "*.local:3000",
        ],
      }),
    },
  },
};

export default nextConfig;
