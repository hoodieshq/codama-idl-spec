import type { InferPageType } from 'fumadocs-core/source';
import { docsSource, recipesSource, specSource } from '@/lib/source';

type AnyPage =
  | InferPageType<typeof docsSource>
  | InferPageType<typeof recipesSource>
  | InferPageType<typeof specSource>;

/** Format a page as plain markdown for LLM consumption - a page url plus the processed body. */
export async function getLLMText(page: AnyPage): Promise<string> {
  const processed = await page.data.getText('processed');
  return `# ${page.url}\n${processed}`;
}
