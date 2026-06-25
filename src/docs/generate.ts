/**
 * Spec → documentation, split into two framework-agnostic-friendly halves:
 *
 *   - `buildModel(spec, options)` walks the spec and produces a `DocModel`:
 *     pages with plain-Markdown bodies plus category/ordering metadata. All
 *     the spec logic lives here — the registry, link resolution, the
 *     Data/Children split, principal-union landing pages, enum pages, the
 *     `extendNode` seam. It knows nothing about MDX or `meta.json`.
 *   - `renderFumadocs(model)` serializes that model into Fumadocs MDX:
 *     frontmatter per page + `meta.json` navigation. A different framework is
 *     a different renderer over the same model.
 *
 * `generate = renderFumadocs ∘ buildModel` keeps the `DocsGenerator` API.
 *
 * Pure and IO-free — see `./types`.
 */

import { isChildAttribute, isExample } from '../api';
import type { AttributeSpec, CategorySpec, EnumerationSpec, ExampleSpec, NodeSpec, Spec, UnionSpec } from '../api';
import { pascal, renderTypeExpr } from './renderTypeExpr';
import type { DocLinkResolver } from './renderTypeExpr';
import type { DocCategoryNav, DocFile, DocModel, DocPage, DocsOptions, NodePageContext } from './types';

/** Escape a value for use inside a GFM table cell. */
function cell(text: string): string {
    return text.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
}

/** Join doc paragraphs into a single table-cell string, or an em dash. */
function docsCell(docs: readonly string[] | undefined): string {
    return docs && docs.length > 0 ? cell(docs.join(' ')) : '—';
}

/** A human label for a category folder (`contextualValue` → `Contextual value`). */
function categoryTitle(name: string): string {
    const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    return spaced[0].toUpperCase() + spaced.slice(1);
}

/** The principal union of a category — the abstract `<category>Node` union, if any. */
function principalUnion(category: CategorySpec): UnionSpec | undefined {
    return category.unions.find(u => u.name === `${category.name}Node`);
}

/** Flatten a union to its concrete member node kinds, following nested unions. */
function flattenUnion(name: string, unionsByName: Map<string, UnionSpec>, seen = new Set<string>()): string[] {
    if (seen.has(name)) return [];
    seen.add(name);
    const union = unionsByName.get(name);
    if (!union) return [];
    const out: string[] = [];
    for (const member of union.members) {
        if (member.kind === 'node') out.push(member.name);
        else out.push(...flattenUnion(member.name, unionsByName, seen));
    }
    return out;
}

function attributeRow(attr: AttributeSpec, link: DocLinkResolver): string {
    const name = `\`${attr.name}\``;
    const optional = attr.optional ? ' _(optional)_' : '';
    const type = cell(renderTypeExpr(attr.type, link));
    return `| ${name} | ${type}${optional} | ${docsCell(attr.docs)} |`;
}

function attributesSection(node: NodeSpec, link: DocLinkResolver): string {
    const data = node.attributes.filter(a => !isChildAttribute(a.type));
    const children = node.attributes.filter(a => isChildAttribute(a.type));

    const table = (rows: string[]): string =>
        ['| Attribute | Type | Description |', '| --- | --- | --- |', ...rows].join('\n');

    // The `kind` discriminator is implicit on every node (not declared as an
    // attribute), so synthesise its row to match the canonical docs.
    const kindRow = `| \`kind\` | \`${JSON.stringify(node.kind)}\` | The node discriminator. |`;

    const out: string[] = [
        '## Attributes',
        '',
        '### Data',
        '',
        table([kindRow, ...data.map(a => attributeRow(a, link))]),
    ];
    if (children.length > 0) {
        out.push('', '### Children', '', table(children.map(a => attributeRow(a, link))));
    }
    return out.join('\n');
}

function examplesSection(node: NodeSpec): string | null {
    const examples = node.examples.filter(isExample) as ExampleSpec[];
    if (examples.length === 0) return null;
    const blocks = examples.map(ex => {
        const parts: string[] = [];
        if (ex.title) parts.push(`### ${ex.title}`);
        if (ex.description) parts.push(ex.description);
        parts.push(`\`\`\`${ex.lang ?? 'ts'}\n${ex.code}\n\`\`\``);
        return parts.join('\n\n');
    });
    return ['## Examples', '', blocks.join('\n\n')].join('\n');
}

function nodePage(node: NodeSpec, ctx: NodePageContext, options: DocsOptions, link: DocLinkResolver): DocPage {
    const title = pascal(node.kind);
    const docs = node.docs ?? [];
    const description = docs[0] ?? `The ${title} node.`;

    const body: string[] = [];
    if (docs.length > 0) body.push(docs.join('\n\n'));
    body.push(attributesSection(node, link));
    const examples = examplesSection(node);
    if (examples) body.push(examples);
    const extended = options.extendNode?.(node, ctx);
    if (extended) body.push(extended);

    return {
        body: body.join('\n\n'),
        category: ctx.category.name,
        description,
        meta: options.frontmatter?.(node, ctx),
        slug: title,
        title,
    };
}

/** Category landing page built from the principal union (its abstract member list). */
function unionIndexPage(
    union: UnionSpec,
    category: CategorySpec,
    unionsByName: Map<string, UnionSpec>,
    link: DocLinkResolver,
): DocPage {
    const title = pascal(union.name);
    const docs = union.docs ?? [];
    const description = docs[0] ?? `Abstract union — one of the ${categoryTitle(category.name).toLowerCase()} nodes.`;

    const members = [...new Set(flattenUnion(union.name, unionsByName))];
    const items = members.map(kind => `- ${renderTypeExpr({ kind: 'node', name: kind }, link)}`);
    const membersSection = [
        `## Members`,
        '',
        `\`${title}\` is an abstract union — use one of the following nodes:`,
        '',
        ...items,
    ].join('\n');

    return {
        body: [docs.length > 0 ? docs.join('\n\n') : description, membersSection].join('\n\n'),
        category: category.name,
        description,
        slug: 'index',
        title,
    };
}

function enumPage(enumeration: EnumerationSpec, category: CategorySpec): DocPage {
    const title = pascal(enumeration.name);
    const docs = enumeration.docs ?? [];
    const description = docs[0] ?? `The ${title} enumeration.`;

    const rows = enumeration.variants.map(v => `| \`${v.name}\` | ${docsCell(v.docs)} |`);
    const variantsSection = ['## Variants', '', ['| Variant | Description |', '| --- | --- |', ...rows].join('\n')].join(
        '\n',
    );

    return {
        body: [docs.length > 0 ? docs.join('\n\n') : description, variantsSection].join('\n\n'),
        category: category.name,
        description,
        slug: pascal(enumeration.name),
        title,
    };
}

/** Root landing page: spec version + every category (linked when it has an index) and its pages. */
function indexPage(spec: Spec, baseUrl: string): DocPage {
    const description = `The Codama v${spec.version} node specification.`;
    const sections: string[] = [];
    for (const category of spec.categories) {
        const items = [
            ...category.nodes.map(n => `- [${pascal(n.kind)}](${baseUrl}/${category.name}/${pascal(n.kind)})`),
            ...category.enumerations.map(e => `- [${pascal(e.name)}](${baseUrl}/${category.name}/${pascal(e.name)})`),
        ];
        if (items.length === 0) continue;
        const section: string[] = [`## ${categoryTitle(category.name)}`, ''];
        if (principalUnion(category)) {
            const label = categoryTitle(category.name).toLowerCase();
            section.push(`[Browse all ${label} nodes →](${baseUrl}/${category.name})`, '');
        }
        section.push(...items);
        sections.push(section.join('\n'));
    }
    return {
        body: [description, ...sections].join('\n\n'),
        category: '',
        description,
        slug: 'index',
        title: 'Node reference',
    };
}

/** Walk the spec into a framework-agnostic document model. */
export function buildModel(spec: Spec, options: DocsOptions = {}): DocModel {
    const baseUrl = options.baseUrl ?? '';

    // Reference registry built from the spec's category structure: node kinds,
    // principal unions, and enumerations all resolve to a page; everything else
    // (helper unions, etc.) is left un-linked.
    const categoryOfNode = new Map<string, string>();
    const categoryOfPrincipalUnion = new Map<string, string>();
    const categoryOfEnum = new Map<string, string>();
    const unionsByName = new Map<string, UnionSpec>();
    for (const c of spec.categories) {
        for (const n of c.nodes) categoryOfNode.set(n.kind, c.name);
        for (const u of c.unions) unionsByName.set(u.name, u);
        const principal = principalUnion(c);
        if (principal) categoryOfPrincipalUnion.set(principal.name, c.name);
        for (const e of c.enumerations) categoryOfEnum.set(e.name, c.name);
    }

    const link: DocLinkResolver =
        options.linkResolver ??
        (rf => {
            const cat =
                rf.kind === 'node'
                    ? categoryOfNode.get(rf.name)
                    : rf.kind === 'union'
                      ? categoryOfPrincipalUnion.get(rf.name)
                      : categoryOfEnum.get(rf.name);
            if (!cat) return null;
            // Principal unions map to the category landing; nodes and enums to their own page.
            return rf.kind === 'union' ? `${baseUrl}/${cat}` : `${baseUrl}/${cat}/${pascal(rf.name)}`;
        });

    const pages: DocPage[] = [];
    const categories: DocCategoryNav[] = [];
    for (const category of spec.categories) {
        const ctx: NodePageContext = { category };
        const pageNames: string[] = [];

        const principal = principalUnion(category);
        if (principal) {
            pages.push(unionIndexPage(principal, category, unionsByName, link));
            pageNames.push('index');
        }
        for (const node of category.nodes) {
            pages.push(nodePage(node, ctx, options, link));
            pageNames.push(pascal(node.kind));
        }
        for (const enumeration of category.enumerations) {
            pages.push(enumPage(enumeration, category));
            pageNames.push(pascal(enumeration.name));
        }

        if (pageNames.length > 0) {
            categories.push({ name: category.name, pages: pageNames, title: categoryTitle(category.name) });
        }
    }
    pages.push(indexPage(spec, baseUrl));

    return { categories, pages };
}

function frontmatterBlock(data: Record<string, unknown>): string {
    const lines = Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
    return `---\n${lines.join('\n')}\n---`;
}

function fumadocsPagePath(page: DocPage): string {
    return page.category ? `${page.category}/${page.slug}.mdx` : `${page.slug}.mdx`;
}

/** Serialize a `DocModel` into Fumadocs MDX: frontmatter per page + `meta.json` navigation. */
export function renderFumadocs(model: DocModel): DocFile[] {
    const files: DocFile[] = [];

    for (const page of model.pages) {
        const frontmatter = frontmatterBlock({
            title: page.title,
            description: page.description,
            ...(page.meta ?? {}),
        });
        files.push({ content: `${frontmatter}\n\n${page.body}\n`, path: fumadocsPagePath(page) });
    }

    for (const category of model.categories) {
        files.push({
            content: JSON.stringify({ pages: category.pages, title: category.title }, null, 2) + '\n',
            path: `${category.name}/meta.json`,
        });
    }
    files.push({
        content: JSON.stringify({ pages: ['index', ...model.categories.map(c => c.name)] }, null, 2) + '\n',
        path: 'meta.json',
    });

    return files;
}

export function generate(spec: Spec, options: DocsOptions = {}): DocFile[] {
    const files = renderFumadocs(buildModel(spec, options));
    return options.extraPages ? [...files, ...options.extraPages] : files;
}
