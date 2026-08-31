import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages.
 * Served at https://alicelabsllc.github.io/OpenGravity/ → basePath must match
 * the repository name exactly (case-sensitive).
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/OpenGravity",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
