import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/qr8",
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/qr8",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
