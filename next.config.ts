import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The _legacy Vite SPA bundle was built with base="/" (root). It's been
  // relocated under /_legacy/ in this Next.js project, but the compiled JS
  // still resolves internal asset paths via SF(e) = "/" + e, producing
  // absolute "/assets/...", "/cdn/..." etc.  Rewrite those back to their
  // actual location under /_legacy/ so static assets resolve correctly.
  async rewrites() {
    return [
      {
        source: "/assets/:path+",
        destination: "/_legacy/assets/:path+",
      },
      {
        source: "/cdn/:path+",
        destination: "/_legacy/cdn/:path+",
      },
      {
        source: "/fonts.css",
        destination: "/_legacy/fonts.css",
      },
      {
        source: "/llms.txt",
        destination: "/_legacy/llms.txt",
      },
      {
        source: "/logo-aura-128-light.png",
        destination: "/_legacy/logo-aura-128-light.png",
      },
      {
        source: "/logo-aura-128-dark.png",
        destination: "/_legacy/logo-aura-128-dark.png",
      },
      {
        source: "/logo-aura.svg",
        destination: "/_legacy/logo-aura.svg",
      },
    ];
  },
};

export default nextConfig;
