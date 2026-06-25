import type { InferPageType } from 'fumadocs-core/source';

import type { source } from '@/lib/source';

/**
 * One page rendered as plain markdown for AI-agent consumption — used by both
 * `/llms-full.txt` and the `/docs/<...>.mdx` route. Format matches other
 * Fumadocs sites: an H1 of `Title (url-path)`, then the processed body, with no
 * YAML frontmatter.
 */
export async function getLLMText(page: InferPageType<typeof source>): Promise<string> {
    const body = await page.data.getText('processed');
    return `# ${page.data.title} (${page.url})\n\n${body}`;
}
