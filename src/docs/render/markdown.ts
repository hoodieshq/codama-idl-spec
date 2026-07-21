import { markdownTable } from 'markdown-table';
import type { Heading, Html, List, ListItem as MdastListItem, Nodes, PhrasingContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Options } from 'mdast-util-to-markdown';

import type { ListItem, MarkupRenderer } from '../types';

/**
 * The default markdown renderer.
 *
 * Block and inline formatting (headings, lists, code fence sizing, emphasis) is delegated to
 * `mdast-util-to-markdown`. Tables stay on `markdown-table` to avoid pulling the micromark parser that the
 * mdast GFM table extension depends on, and to keep table output byte-identical. Composed inline markup arrives
 * pre-rendered, so it is injected as verbatim `html` nodes the serializer never touches. Escaping has two shapes:
 * `prose` parses authored text as markdown (so code spans stay intact) and lets the serializer escape it, while
 * `escapeChar` backslashes mdx-significant chars in renderer-generated delimiters. Options are pinned to the
 * committed output; `unsafe` forces `<`/`{` in phrasing, which `prose` relies on and block serialization ignores.
 */

/** Serializer options pinned to the committed markdown style (`-` bullets, `_` italics, `**` bold, backtick fences). */
const OPTIONS: Options = {
    bullet: '-',
    emphasis: '_',
    fence: '`',
    listItemIndent: 'one',
    rule: '-',
    strong: '*',
    // `<` opens JSX and `{` an expression in mdx; core escapes neither in phrasing, so force both (prose only).
    unsafe: [
        { character: '<', inConstruct: 'phrasing' },
        { character: '{', inConstruct: 'phrasing' },
    ],
};

/** Serialize one node, dropping the single trailing newline that `toMarkdown` adds - `renderPages` joins blocks itself. */
function serialize(node: Nodes): string {
    return toMarkdown(node, OPTIONS).replace(/\n$/, '');
}

/** Wrap already-rendered inline markdown as a verbatim phrasing node so the serializer never escapes or reformats it. */
function raw(value: string): Html {
    return { type: 'html', value };
}

/** Build a (possibly nested) mdast list from the renderer's `ListItem` tree. */
function toListNode(type: 'bulleted' | 'numbered', items: readonly ListItem[]): List {
    return {
        type: 'list',
        ordered: type === 'numbered',
        spread: false,
        children: items.map(item => toListItemNode(type, item)),
    };
}

/** Build one mdast list item: a tight paragraph, plus a nested list when the item has children. */
function toListItemNode(type: 'bulleted' | 'numbered', item: ListItem): MdastListItem {
    const content = typeof item === 'string' ? item : item.content;
    const children: MdastListItem['children'] = [{ type: 'paragraph', children: [raw(content)] }];
    if (typeof item !== 'string' && item.children.length) {
        children.push(toListNode(type, item.children));
    }
    return { type: 'listItem', spread: false, children };
}

export const markdownRenderer: MarkupRenderer = {
    heading(level, content) {
        return serialize({ type: 'heading', depth: level as Heading['depth'], children: [raw(content)] });
    },
    paragraph(content) {
        return serialize({ type: 'paragraph', children: [raw(content)] });
    },
    code(value) {
        return serialize({ type: 'inlineCode', value });
    },
    link(text, href) {
        return serialize({ type: 'link', url: href, children: [raw(text)] });
    },
    bold(content) {
        return serialize({ type: 'strong', children: [raw(content)] });
    },
    italic(content) {
        return serialize({ type: 'emphasis', children: [raw(content)] });
    },
    list(type, items) {
        return serialize(toListNode(type, items));
    },
    codeBlock(language, code) {
        return serialize({ type: 'code', lang: language, value: code });
    },
    table(head, rows) {
        if (rows.some(row => row.length !== head.length)) {
            throw new Error(`markdownRenderer.table: expected each row to have ${head.length} cells`);
        }
        return markdownTable([head.map(escapeCell), ...rows.map(row => row.map(escapeCell))]);
    },
    prose(markdown) {
        // Parse as markdown so existing code spans stay intact, then re-serialize with `<` and `{` escaped.
        // Demote inline HTML (`<T>`, `<Foo>`) back to literal text: CommonMark reads those as html, but in mdx they
        // are JSX, not the literal text the author meant, so escape them like any other prose.
        // Authored docs are single-paragraph prose; serialize the first block's phrasing inline (empty -> '').
        const [block] = fromMarkdown(markdown).children;
        const phrasing = block?.type === 'paragraph' ? block.children : [];
        const children: PhrasingContent[] = phrasing.map(node =>
            node.type === 'html' ? { type: 'text', value: node.value } : node,
        );
        return serialize({ type: 'paragraph', children });
    },
    escapeChar(value) {
        return `\\${value}`;
    },
};

/** Escape characters that would otherwise break a markdown table cell (bare pipes read as column separators). */
function escapeCell(cell: string): string {
    return cell.replace(/\|/g, char => `\\${char}`);
}
