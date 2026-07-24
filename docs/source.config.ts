import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

// `includeProcessedMarkdown` exposes each page's processed markdown so the LLM
// routes can emit it via `page.data.getText('processed')`.
const docsConfig = { postprocess: { includeProcessedMarkdown: true } };

export const docs = defineDocs({
  dir: 'content/docs',
  docs: docsConfig,
});

export const recipes = defineDocs({
  dir: 'content/recipes',
  docs: docsConfig,
});

export const spec = defineDocs({
  dir: 'content/spec',
  docs: docsConfig,
});

export default defineConfig();
