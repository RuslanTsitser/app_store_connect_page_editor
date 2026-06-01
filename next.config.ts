import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // HMR при открытии dev-сервера по LAN (Network URL в терминале)
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.182",
  ],
};

export default nextConfig;
