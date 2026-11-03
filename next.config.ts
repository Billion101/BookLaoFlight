import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "laoairlines.com" },
      { protocol: "https", hostname: "www.laoskyway.com" },
      { protocol: "https", hostname: "lxairways.com" }
    ]
  }
};

export default nextConfig;

