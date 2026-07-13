import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Allow large PDF uploads via server actions if needed
    },
  },
};

export default nextConfig;
