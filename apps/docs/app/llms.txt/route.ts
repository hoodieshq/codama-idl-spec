import { source } from '@/lib/source';

// Static: the spec is fixed per build.
export const revalidate = false;

export function GET(): Response {
    const lines = source.getPages().map(p => `- [${p.data.title}](${p.url})`);
    const body = ['# Codama node reference', '', 'Per-node documentation for AI agents.', '', ...lines].join('\n');
    return new Response(body);
}
