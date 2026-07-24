import { readFileSync } from 'node:fs';

import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Full spec version emitted by the generator (e.g. `1.8.0`) - derive the URL major (`v1`) for the /spec redirect.
const { version } = JSON.parse(readFileSync(new URL('./spec-version.json', import.meta.url), 'utf8'));
const major = `v${version.split('.')[0]}`;

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
    // Bare /spec lands on the current spec major, read from the generated spec-version.json.
    return [{ source: '/spec', destination: `/spec/${major}`, permanent: false }];
  },
};

export default withMDX(config);
