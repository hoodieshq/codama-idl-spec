import { describe, expect, it } from 'vitest';

import { buildFumadocFiles, frontmatter } from '../../generators/fumadocs/build';
import { absoluteLinks, generateDocs, HostedDocsPathConfig } from '../../src/docs';
import { getSpec } from '../../src/v1';

const docModel = generateDocs(getSpec(), {
    pathConfig: HostedDocsPathConfig,
    linkStrategy: absoluteLinks({
        baseUrl: '/spec/v1',
        extension: '',
        indexFileName: HostedDocsPathConfig.indexFileName,
    }),
    root: { title: 'Codama Spec', description: 'The canonical Codama node specification.' },
});
const FILES = buildFumadocFiles(docModel, HostedDocsPathConfig.indexFileName, { root: true, title: 'v1.8.0' });
const fileAt = (p: string) => FILES.find(file => file.path === p);
const json = (p: string) => JSON.parse(fileAt(p)!.content);

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

describe('buildFumadocFiles', () => {
    it('emits one .md per page, each opening with a title frontmatter', () => {
        const md = FILES.filter(file => file.path.endsWith('.md'));
        expect(md).toHaveLength(docModel.pages.length);
        for (const file of md) {
            expect(file.content.startsWith('---\ntitle: "')).toBe(true);
        }
    });

    it('labels each category folder without forcing its page order', () => {
        // countNodes is category `count` -> index title `Count`; meta carries only the label, no `pages`
        expect(json('countNodes/meta.json')).toEqual({ title: 'Count' });
    });

    it('marks the version root and lists folders before loose top-level pages', () => {
        const meta = json('meta.json');
        expect(meta.root).toBe(true);
        expect(meta.title).toBe('v1.8.0');
        const pages: string[] = meta.pages;
        expect(pages.indexOf('countNodes')).toBeGreaterThanOrEqual(0);
        expect(pages.indexOf('AccountNode')).toBeGreaterThan(pages.indexOf('countNodes'));
    });

    it('emits extension-less spec links with no /index suffix', () => {
        const linkPattern = /\]\((\/spec\/v1[^)]*)\)/g;
        for (const file of FILES.filter(f => f.path.endsWith('.md'))) {
            for (const match of file.content.matchAll(linkPattern)) {
                expect(match[1].endsWith('/index'), `bad link ${match[1]} in ${file.path}`).toBe(false);
                expect(match[1].endsWith('.md'), `bad link ${match[1]} in ${file.path}`).toBe(false);
            }
        }
    });

    it('every internal spec link resolves to an emitted page URL', () => {
        const urls = new Set(
            docModel.pages.map(page => {
                const s =
                    page.pathSegments[page.pathSegments.length - 1] === 'index'
                        ? page.pathSegments.slice(0, -1)
                        : page.pathSegments;
                return `/spec/v1${s.length ? `/${s.join('/')}` : ''}`;
            }),
        );
        const linkPattern = /\]\((\/spec\/v1[^)]*)\)/g;
        for (const file of FILES.filter(f => f.path.endsWith('.md'))) {
            for (const match of file.content.matchAll(linkPattern)) {
                expect(urls.has(match[1]), `unresolved ${match[1]} in ${file.path}`).toBe(true);
            }
        }
    });
});
