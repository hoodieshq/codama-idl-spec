import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // This app installs standalone (its own lockfile), so pin the workspace root
  // here - otherwise Next infers the repo root from the parent lockfile.
  turbopack: {
    root: import.meta.dirname,
  },
  async rewrites() {
    // Serve each page's markdown at `/<collection>/<...>.mdx` for AI agents.
    // `:path*` also captures the spec version segment (e.g. /spec/v1/x.mdx).
    return [
      { source: '/docs/:path*.mdx', destination: '/llms.mdx/docs/:path*' },
      { source: '/recipes/:path*.mdx', destination: '/llms.mdx/recipes/:path*' },
      { source: '/spec/:path*.mdx', destination: '/llms.mdx/spec/:path*' },
    ];
  },
  async redirects() {
    // Bare /spec lands on the current spec major - bump when the spec major changes (rare).
    return [{ source: '/spec', destination: '/spec/v1', permanent: false }];
  },
};

export default withMDX(config);
