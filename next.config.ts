import type { NextConfig } from "next";

const defaultDevOrigins = ["localhost", "127.0.0.1"];
const extraDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  // HMR when opening the dev server via LAN (optional ALLOWED_DEV_ORIGINS in .env.local)
  allowedDevOrigins: [...new Set([...defaultDevOrigins, ...extraDevOrigins])],
};

export default nextConfig;
