import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@resvg/resvg-js", "sharp", "bcryptjs"],
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
