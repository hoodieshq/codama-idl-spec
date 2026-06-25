import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

// Content is synced from the repo-root `v1/docs/` artifact into `content/docs`
// by `scripts/sync-content.mjs` (run via the package scripts). It cannot be
// sourced in place because fumadocs-mdx emits ESM `.mdx.js` companions and
// `v1/docs/` lives under the repo-root CommonJS package.
export const docs = defineDocs({
    dir: 'content/docs',
    // Expose processed markdown so the llms-full.txt route can emit each page's
    // text for AI agents (`page.data.getText('processed')`).
    docs: {
        postprocess: {
            includeProcessedMarkdown: true,
        },
    },
});

export default defineConfig();
