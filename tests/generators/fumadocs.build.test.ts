import { getFromRenderMap } from '@codama/fragments';
import { describe, expect, it } from 'vitest';

import { frontmatter, getFumadocsRenderMap } from '../../generators/docs/fumadocs/build';
import { generateDocs } from '../../src/docs';
import { getSpec } from '../../src/v1';

const docModel = generateDocs(getSpec());
const RENDER_MAP = getFumadocsRenderMap(docModel, { root: true, title: 'v1.8.0' });
/** Map entries as `{ path, content }` pairs - most assertions below walk every emitted file. */
const FILES = [...RENDER_MAP].map(([path, fragment]) => ({ content: fragment.content, path }));
const json = (p: string) => JSON.parse(getFromRenderMap(RENDER_MAP, p).content);

describe('frontmatter', () => {
    it('json-encodes values as YAML double-quoted scalars', () => {
        expect(frontmatter({ title: 'NumberTypeNode', description: 'A "wrapped" number: u64.' })).toBe(
            '---\ntitle: "NumberTypeNode"\ndescription: "A \\"wrapped\\" number: u64."\n---',
        );
    });

    it('drops undefined values', () => {
        expect(frontmatter({ title: 'BareNode', description: undefined })).toBe('---\ntitle: "BareNode"\n---');
    });

    it('keeps newlines as YAML double-quote escapes', () => {
        expect(frontmatter({ title: 'X', description: 'a\nb' })).toBe('---\ntitle: "X"\ndescription: "a\\nb"\n---');
    });
});

describe('getFumadocsRenderMap', () => {
    it('keys every entry by a path relative to the version root, so writeRenderMap roots the whole tree', () => {
        for (const file of FILES) {
            expect(file.path.startsWith('/'), `absolute path ${file.path}`).toBe(false);
        }
    });

    it('emits one .mdx per page, each opening with a title frontmatter', () => {
        const md = FILES.filter(file => file.path.endsWith('.mdx'));
        expect(md).toHaveLength(docModel.pages.length);
        for (const file of md) {
            expect(file.content.startsWith('---\ntitle: "')).toBe(true);
        }
    });

    it('labels each category folder without forcing its page order', () => {
        // countNodes is category `count` -> index title `Count`; meta carries only the label, no `pages`
        expect(json('countNodes/meta.json')).toEqual({ title: 'Count' });
    });

    it('marks the version root and defers page order to Fumadocs, hiding the index', () => {
        const meta = json('meta.json');
        expect(meta.root).toBe(true);
        expect(meta.title).toBe('v1.8.0');
        expect(meta.pages).toEqual(['!index', '...']);
    });

    it('emits relative .mdx links - createRelativeLink rewrites them to route URLs at render time', () => {
        // internal links are the relative ones (start with ./ or ../); external http(s) links are left alone
        const linkPattern = /\]\(([^)]+)\)/g;
        for (const file of FILES.filter(f => f.path.endsWith('.mdx'))) {
            for (const match of file.content.matchAll(linkPattern)) {
                const href = match[1];
                if (href.startsWith('http')) continue;
                expect(href.startsWith('./') || href.startsWith('../'), `bad link ${href} in ${file.path}`).toBe(true);
                expect(href.endsWith('.mdx'), `bad link ${href} in ${file.path}`).toBe(true);
            }
        }
    });

    it('every relative link resolves to an emitted .mdx file', () => {
        const emitted = new Set(FILES.filter(f => f.path.endsWith('.mdx')).map(f => f.path));
        const linkPattern = /\]\(([^)]+)\)/g;
        for (const file of FILES.filter(f => f.path.endsWith('.mdx'))) {
            const dir = file.path.split('/').slice(0, -1);
            for (const match of file.content.matchAll(linkPattern)) {
                const href = match[1];
                if (href.startsWith('http')) continue;
                const resolved = resolvePosix(dir, href);
                expect(emitted.has(resolved), `unresolved ${href} (-> ${resolved}) in ${file.path}`).toBe(true);
            }
        }
    });
});

/** Resolve a POSIX relative `href` against the directory segments `dir`, returning a slash-joined file path. */
function resolvePosix(dir: readonly string[], href: string): string {
    const out = [...dir];
    for (const part of href.split('/')) {
        if (part === '.' || part === '') continue;
        if (part === '..') out.pop();
        else out.push(part);
    }
    return out.join('/');
}
