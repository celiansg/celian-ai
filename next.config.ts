import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/bat/generate": ["./knowledge/templates/**"],
    "/api/bat/template": ["./knowledge/templates/**"],
    "/bat": ["./knowledge/templates/**"],
  },
};

export default nextConfig;
