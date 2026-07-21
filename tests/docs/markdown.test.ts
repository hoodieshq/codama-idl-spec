import { describe, expect, it } from 'vitest';

import { markdownRenderer as markdown } from '../../src/docs/render/markdown';

describe('markdownRenderer', () => {
    it('aligns columns to the widest cell and pads the separator', () => {
        expect(
            markdown.table(
                ['Attribute', 'Type', 'Description'],
                [['`kind`', '`"pdaNode"`', 'The node discriminator.']],
            ),
        ).toBe(
            [
                '| Attribute | Type        | Description             |',
                '| --------- | ----------- | ----------------------- |',
                '| `kind`    | `"pdaNode"` | The node discriminator. |',
            ].join('\n'),
        );
    });

    it('escapes pipes in cells so a union type does not spawn extra columns', () => {
        // `true | false` would otherwise read as three separate columns and break the table
        expect(
            markdown.table(
                ['Attribute', 'Type', 'Description'],
                [['`isSigner`', '`true | false | "either"`', 'Whether each account must sign.']],
            ),
        ).toBe(
            [
                '| Attribute  | Type                        | Description                     |',
                '| ---------- | --------------------------- | ------------------------------- |',
                '| `isSigner` | `true \\| false \\| "either"` | Whether each account must sign. |',
            ].join('\n'),
        );
    });

    it('throws a clear error when a row cell count differs from the header', () => {
        expect(() => markdown.table(['A', 'B'], [['only-one']])).toThrow(
            'markdownRenderer.table: expected each row to have 2 cells',
        );
        expect(() => markdown.table(['A', 'B'], [['a', 'b', 'c']])).toThrow(
            'markdownRenderer.table: expected each row to have 2 cells',
        );
    });

    it('renders code, link, italic, heading, list', () => {
        expect(markdown.code('u64')).toBe('`u64`');
        expect(markdown.link('`TypeNode`', '../typeNodes/TypeNode.md')).toBe('[`TypeNode`](../typeNodes/TypeNode.md)');
        expect(markdown.italic('(optional)')).toBe('_(optional)_');
        expect(markdown.heading(3, 'Data')).toBe('### Data');
        expect(markdown.list('bulleted', ['a', 'b'])).toBe('- a\n- b');
        expect(markdown.list('numbered', ['a', 'b'])).toBe('1. a\n2. b');
    });

    it('renders a nested list, indenting children under their parent marker', () => {
        expect(markdown.list('bulleted', ['top', { content: 'parent', children: ['a', 'b'] }])).toBe(
            '- top\n- parent\n  - a\n  - b',
        );
        // a node with no children renders as a plain leaf line
        expect(markdown.list('bulleted', [{ content: 'lonely', children: [] }])).toBe('- lonely');
    });

    it('fences code spans so inner backticks do not close the span early', () => {
        // no backticks: single-backtick fence, unchanged
        expect(markdown.code('u64')).toBe('`u64`');
        // inner backtick run of 1: fence grows to 2
        expect(markdown.code('a`b')).toBe('``a`b``');
        // starts/ends with a backtick: fence of 2 plus a stripped space pad
        expect(markdown.code('`x`')).toBe('`` `x` ``');
        // inner run of 2: a 1-backtick fence with space pad already cannot be closed by a run of 2
        expect(markdown.code('``')).toBe('` `` `');
    });

    it('fences code blocks so an inner fence line does not close the block early', () => {
        // no inner fence: default 3-backtick fence, unchanged
        expect(markdown.codeBlock('ts', 'const a = 1')).toBe('```ts\nconst a = 1\n```');
        // code contains a 3-backtick run: fence grows to 4
        expect(markdown.codeBlock('md', '```\nnested\n```')).toBe('````md\n```\nnested\n```\n````');
    });

    it('escapeChar backslashes whatever delimiter it is given - the caller only passes chars that must be escaped', () => {
        expect(markdown.escapeChar('<')).toBe('\\<');
        expect(markdown.escapeChar('{')).toBe('\\{');
    });

    it('prose escapes the mdx openers < and { in authored text so output is safe as .md or .mdx', () => {
        expect(markdown.prose('a < b and {x}')).toBe('a \\< b and \\{x}');
    });

    it('prose leaves non-significant characters untouched', () => {
        expect(markdown.prose('u64 | string')).toBe('u64 | string');
    });

    it('prose keeps code spans intact - a backslash inside one would render literally', () => {
        // authored prose carries backticked code like `nestedTypeNode<T>`; the span content stays verbatim
        expect(markdown.prose('wraps another `nestedTypeNode<T>` until reached')).toBe(
            'wraps another `nestedTypeNode<T>` until reached',
        );
    });

    it('prose escapes outside a code span while leaving the span contents intact', () => {
        expect(markdown.prose('use {x} with `${root.path}`')).toBe('use \\{x} with `${root.path}`');
    });

    it('prose escapes tag-shaped tokens - CommonMark reads <T> as html, but in mdx it is JSX, not literal text', () => {
        // without demoting html back to text these would pass through unescaped and render as broken JSX in .mdx
        expect(markdown.prose('wraps a <T> and a <Foo>')).toBe('wraps a \\<T> and a \\<Foo>');
    });
});
