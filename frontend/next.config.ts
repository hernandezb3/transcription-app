import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // standalone enables Next.js to produce a self-contained build
  // used by Dockerfile.prod for production images
  output: "standalone",

  // Turbopack is the default bundler in Next.js 16+
  turbopack: {},

  ...(isDev && {
    webpack: (config) => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
      return config;
    },
  }),
};

export default nextConfig;
