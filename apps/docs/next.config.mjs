import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
    reactStrictMode: true,
    // Serve each node's markdown at the natural `/docs/<...>.mdx` URL by
    // rewriting it to the markdown route handler.
    async rewrites() {
        return [{ destination: '/api/markdown/:path*', source: '/docs/:path*.mdx' }];
    },
};

export default withMDX(config);
