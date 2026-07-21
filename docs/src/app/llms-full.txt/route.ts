import { getLLMText } from '@/lib/get-llm-text';
// docs/recipes hidden for now - re-add their imports to restore (see `pages` below).
import { specSource } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  // docs/recipes hidden for now - re-add [...docsSource.getPages(), ...recipesSource.getPages()] to restore.
  const pages = [...specSource.getPages()];
  const scanned = await Promise.all(pages.map(getLLMText));
  return new Response(scanned.join('\n\n'), { headers: { 'Content-Type': 'text/plain' } });
}
