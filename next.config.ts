import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local host variants used by dev tooling/proxies.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // Pin the workspace root to this project (a parent lockfile would otherwise
  // make Next infer the wrong root).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
