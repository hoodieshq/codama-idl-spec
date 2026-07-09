import { describe, expect, it } from 'vitest';

import type { EnumerationSpec, NodeSpec } from '../../api';
import { relativeLinks } from '../links';
import { LocalDocsPathConfig } from '../pathConfig';
import type { DocConfig, DocRef, NavRegistry } from '../types';
import { markdownRenderer } from './markdown';
import type { RenderCtx } from './renderPages';
import { renderEnumPage, renderNodePage } from './renderPages';

/**
 * A minimal RenderCtx over the real markdown renderer - lookup returns fixed path segments, links resolve to '#'.
 * `languages` is left undefined by default, matching the render-every-language config default.
 */
function makeCtx(config?: Pick<DocConfig, 'languages'>): RenderCtx {
    const registry: NavRegistry = {
        entries: [],
        lookup: (ref: DocRef) => ({ ref, pathSegments: ['generated', 'page'] }),
    };
    return {
        markup: markdownRenderer,
        registry,
        config: { pathConfig: LocalDocsPathConfig, linkStrategy: relativeLinks('md'), languages: config?.languages },
        link: () => '#',
    };
}

describe('renderNodePage', () => {
    it('renders a node page with a PascalCased heading, an Attributes/Data section, and the synthesized kind row', () => {
        const node: NodeSpec = {
            kind: 'numberValueNode',
            docs: ['A literal number value.'],
            attributes: [{ name: 'number', type: { kind: 'integer', width: 'u64' }, docs: ['The number.'] }],
            examples: [],
        };

        const page = renderNodePage(node, makeCtx());

        expect(page.ref).toEqual({ kind: 'node', name: 'numberValueNode' });
        expect(page.pathSegments).toEqual(['generated', 'page']);
        expect(page.content).toContain('# NumberValueNode');
        expect(page.content).toContain('A literal number value.');
        expect(page.content).toContain('## Attributes');
        expect(page.content).toContain('### Data');
        expect(page.content).toContain('`kind`');
        expect(page.content).toContain('`"numberValueNode"`');
        expect(page.content).toContain('`u64`');
    });

    it('escapes pipes from a literalUnion cell so union values do not spawn extra table columns', () => {
        const node: NodeSpec = {
            kind: 'sideNode',
            attributes: [{ name: 'side', type: { kind: 'literalUnion', values: ['left', 'right'] } }],
            examples: [],
        };

        const page = renderNodePage(node, makeCtx());

        // the raw union body is `"left" | "right"`; inside a table cell the pipe must be escaped as `\|`
        expect(page.content).toContain('"left" \\| "right"');
        expect(page.content).not.toContain('"left" | "right"');
    });
});

describe('renderNodePage examples', () => {
    /** A node carrying one example with both a TypeScript and a Rust code block. */
    const node: NodeSpec = {
        kind: 'amountTypeNode',
        attributes: [],
        examples: [
            {
                title: 'a u32 USD amount',
                code: [
                    { language: 'typescript', content: ["amountTypeNode(numberTypeNode('u32'), 2, 'USD');"] },
                    { language: 'rust', content: ['amount_type_node(number_type_node(U32), 2, "USD");'] },
                ],
            },
        ],
    };

    it('renders every language block when config.languages is undefined', () => {
        const page = renderNodePage(node, makeCtx(undefined));

        expect(page.content).toContain('## Examples');
        expect(page.content).toContain('### a u32 USD amount');
        expect(page.content).toContain("amountTypeNode(numberTypeNode('u32'), 2, 'USD');");
        expect(page.content).toContain('amount_type_node(number_type_node(U32), 2, "USD");');
    });

    it('keeps only the code blocks whose language is in config.languages', () => {
        const page = renderNodePage(node, makeCtx({ languages: ['typescript'] }));

        expect(page.content).toContain('### a u32 USD amount');
        expect(page.content).toContain("amountTypeNode(numberTypeNode('u32'), 2, 'USD');");
        expect(page.content).not.toContain('amount_type_node(number_type_node(U32), 2, "USD");');
    });

    it('omits an example entirely when config.languages filters out all of its code blocks', () => {
        // the example ships only typescript+rust; restricting to a third language leaves no blocks
        const rustOnlyNode: NodeSpec = {
            kind: 'tsOnlyNode',
            attributes: [],
            examples: [{ title: 'ts snippet', code: [{ language: 'typescript', content: ['tsOnly();'] }] }],
        };

        const page = renderNodePage(rustOnlyNode, makeCtx({ languages: ['rust'] }));

        // no surviving code blocks -> the whole Examples section is dropped
        expect(page.content).not.toContain('## Examples');
        expect(page.content).not.toContain('ts snippet');
    });
});

describe('renderEnumPage', () => {
    it('renders a Variants list, appending the first-doc blurb only when a variant has docs', () => {
        const enumeration: EnumerationSpec = {
            name: 'valueScope',
            docs: ['Where a value applies.'],
            variants: [{ name: 'global', docs: ['Applies everywhere.'] }, { name: 'local' }],
        };

        const page = renderEnumPage(enumeration, makeCtx());

        expect(page.content).toContain('# ValueScope');
        expect(page.content).toContain('## Variants');
        expect(page.content).toContain('- `global` - Applies everywhere.');
        // no docs -> bare label, no trailing ' - ' blurb
        expect(page.content).toContain('- `local`');
        expect(page.content).not.toContain('`local` -');
    });
});
