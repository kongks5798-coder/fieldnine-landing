import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
