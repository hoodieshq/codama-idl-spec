import { getLLMText } from '@/lib/get-llm-text';
import { docsSource, recipesSource, specSource } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const pages = [...docsSource.getPages(), ...recipesSource.getPages(), ...specSource.getPages()];
  const scanned = await Promise.all(pages.map(getLLMText));
  return new Response(scanned.join('\n\n'), { headers: { 'Content-Type': 'text/plain' } });
}
