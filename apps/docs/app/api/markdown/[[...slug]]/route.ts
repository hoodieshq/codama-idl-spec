import { notFound } from 'next/navigation';

import { getLLMText } from '@/lib/get-llm-text';
import { source } from '@/lib/source';

// Serves a node's markdown. Reached via the `/docs/<...>.mdx` rewrite in
// next.config.mjs, so the public URL stays natural (no visible prefix).
export const revalidate = false;

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }): Promise<Response> {
    const { slug } = await params;
    const page = source.getPage(slug);
    if (!page) notFound();

    return new Response(await getLLMText(page), {
        headers: { 'Content-Type': 'text/markdown' },
    });
}
