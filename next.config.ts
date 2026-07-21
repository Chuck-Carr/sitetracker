import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      ...(process.env.NODE_ENV === "development" && {
        allowedOrigins: [
          "localhost:3000",
          "192.168.70.91:3000",
          "*.local:3000",
        ],
      }),
    },
  },
};

export default nextConfig;
