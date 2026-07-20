import type {
    AttributeSpec,
    CategorySpec,
    CodeLanguage,
    DocExample,
    DocExamples,
    EnumerationSpec,
    NestedUnionSpec,
    NodeSpec,
    Spec,
    UnionSpec,
} from '../../api';
import { categoryGroups, hasOwnDirectory } from '../navigation';
import { displayName, pascalCase, refName } from '../ref';
import type {
    CategoryGroup,
    DocConfig,
    DocPage,
    DocRef,
    InjectionSlot,
    InjectPage,
    ListItem,
    MarkupRenderer,
    NavRegistry,
} from '../types';
import { BLOCK_SEPARATOR, DEFAULT_ROOT_DESCRIPTION, DEFAULT_ROOT_TITLE, GROUP_TITLES } from './constants';
import { isDocChild, linkedEntity, renderType } from './renderType';

/** Shared context threaded through every page renderer. `link` is the registry-resolved LinkStrategy. */
export interface RenderCtx {
    markup: MarkupRenderer;
    registry: NavRegistry;
    config: DocConfig;
    link: (from: DocRef, to: DocRef) => string;
}

/** Per-page helpers: `linkTo` binds this page as the link source, `createInjectContext` builds a slot's inject context. */
function createPageContext(ctx: RenderCtx, from: DocRef, page: InjectPage) {
    const linkTo = (target: DocRef): string => ctx.link(from, target);
    const createInjectContext = (slot: InjectionSlot) => ({ page, slot, markup: ctx.markup, linkTo });
    return { linkTo, createInjectContext };
}

export function renderNodePage(node: NodeSpec, ctx: RenderCtx): DocPage {
    const { markup } = ctx;
    const ref: DocRef = { kind: 'node', name: node.kind };
    const { linkTo, createInjectContext } = createPageContext(ctx, ref, { kind: 'node', node });

    // classify: synthesized `kind` row first, then each attribute into Data or Children (declaration order)
    const dataRows: string[][] = [[markup.code('kind'), markup.code(`"${node.kind}"`), 'The node discriminator.']];
    const childRows: string[][] = [];
    for (const attribute of node.attributes) {
        const row = [
            markup.code(attribute.name),
            typeCell(attribute, markup, linkTo),
            getFirstDoc(markup, attribute.docs),
        ];
        if (isDocChild(attribute.type)) {
            childRows.push(row);
        } else {
            dataRows.push(row);
        }
    }

    const cols = ['Attribute', 'Type', 'Description'];
    const parts: (string | undefined)[] = [
        // header
        markup.heading(1, pascalCase(node.kind)),
        // description
        renderSpecDocs(node.docs, markup),
        // injection: afterDescription
        ctx.config.inject?.(createInjectContext('afterDescription')),
        // attributes section
        markup.heading(2, 'Attributes'),
        // data table
        `${markup.heading(3, 'Data')}${BLOCK_SEPARATOR}${markup.table(cols, dataRows)}`,
        // children table (omitted when none)
        childRows.length
            ? `${markup.heading(3, 'Children')}${BLOCK_SEPARATOR}${markup.table(cols, childRows)}`
            : undefined,
        // injection: afterAttributes (e.g. TS-specific Functions from spec-generators)
        ctx.config.inject?.(createInjectContext('afterAttributes')),
        // Examples section
        renderExamples(node.examples, markup, ctx.config.languages),
        // injection: end
        ctx.config.inject?.(createInjectContext('end')),
    ];
    return {
        ref,
        title: pascalCase(node.kind),
        description: node.docs?.[0],
        pathSegments: ctx.registry.lookup(ref).pathSegments,
        content: parts.filter(Boolean).join(BLOCK_SEPARATOR),
    };
}

/**
 * Render all Node examples.
 * `languages` filters which lang block to render (all when undefined).
 */
function renderExamples(
    examples: DocExamples,
    markup: MarkupRenderer,
    languages: readonly CodeLanguage[] | undefined,
): string | undefined {
    const rendered = examples
        .map(example => renderExample(example, markup, languages))
        .filter(block => block !== undefined);
    if (!rendered.length) return undefined;
    return [markup.heading(2, 'Examples'), ...rendered].join(BLOCK_SEPARATOR);
}

/** Render each example. */
function renderExample(
    example: DocExample,
    markup: MarkupRenderer,
    languages: readonly CodeLanguage[] | undefined,
): string | undefined {
    // languages specify which code langs should be included.
    const codeBlocks = example.code.filter(block => languages === undefined || languages.includes(block.language));
    if (!codeBlocks.length) return undefined;
    const parts: (string | undefined)[] = [
        // header
        markup.heading(3, example.title),
        // description
        renderSpecDocs(example.docs, markup),
        // code blocks
        ...codeBlocks.map(code => markup.codeBlock(code.language, code.content.join('\n'))),
    ];
    return parts.filter(Boolean).join(BLOCK_SEPARATOR);
}

export function renderUnionPage(union: UnionSpec, ctx: RenderCtx): DocPage {
    const { markup } = ctx;
    const ref: DocRef = { kind: 'union', name: union.name };
    const { linkTo, createInjectContext } = createPageContext(ctx, ref, { kind: 'union', union });
    const members = markup.list(
        'bulleted',
        union.members.map(member => linkedEntity({ kind: member.kind, name: member.name }, markup, linkTo)),
    );
    const parts: (string | undefined)[] = [
        // header
        markup.heading(1, `${pascalCase(union.name)} (abstract)`),
        // description
        renderSpecDocs(union.docs, markup),
        // injection: afterDescription
        ctx.config.inject?.(createInjectContext('afterDescription')),
        // body: lead-in
        markup.paragraph('One of the following:'),
        // body: member links
        members,
        // injection: end
        ctx.config.inject?.(createInjectContext('end')),
    ];
    return {
        ref,
        title: pascalCase(union.name),
        description: union.docs?.[0],
        pathSegments: ctx.registry.lookup(ref).pathSegments,
        content: parts.filter(Boolean).join(BLOCK_SEPARATOR),
    };
}

export function renderNestedUnionPage(nestedUnion: NestedUnionSpec, ctx: RenderCtx): DocPage {
    const { markup } = ctx;
    const ref: DocRef = { kind: 'nestedUnion', name: nestedUnion.name };
    const { linkTo, createInjectContext } = createPageContext(ctx, ref, { kind: 'nestedUnion', nestedUnion });
    const wrappers = markup.list(
        'bulleted',
        nestedUnion.wrappers.map(wrapper => linkedEntity({ kind: 'node', name: wrapper }, markup, linkTo)),
    );
    const parts: (string | undefined)[] = [
        // header
        markup.heading(1, `${pascalCase(nestedUnion.name)} (recursive)`),
        // description
        renderSpecDocs(nestedUnion.docs, markup),
        // injection: afterDescription
        ctx.config.inject?.(createInjectContext('afterDescription')),
        // body: base type
        markup.paragraph(`Base: ${renderType(nestedUnion.base, markup, linkTo)}`),
        // body: wrappers section
        `${markup.heading(2, 'Wrappers')}${BLOCK_SEPARATOR}${wrappers}`,
        // injection: end
        ctx.config.inject?.(createInjectContext('end')),
    ];
    return {
        ref,
        title: pascalCase(nestedUnion.name),
        description: nestedUnion.docs?.[0],
        pathSegments: ctx.registry.lookup(ref).pathSegments,
        content: parts.filter(Boolean).join(BLOCK_SEPARATOR),
    };
}

export function renderEnumPage(enumeration: EnumerationSpec, ctx: RenderCtx): DocPage {
    const { markup } = ctx;
    const ref: DocRef = { kind: 'enumeration', name: enumeration.name };
    const { createInjectContext } = createPageContext(ctx, ref, { kind: 'enumeration', enumeration });
    const variants = markup.list(
        'bulleted',
        enumeration.variants.map(variant => withBlurb(markup, markup.code(variant.name), variant.docs)),
    );
    const parts: (string | undefined)[] = [
        // header
        markup.heading(1, pascalCase(enumeration.name)),
        // description
        renderSpecDocs(enumeration.docs, markup),
        // injection: afterDescription
        ctx.config.inject?.(createInjectContext('afterDescription')),
        // body: variants section
        `${markup.heading(2, 'Variants')}${BLOCK_SEPARATOR}${variants}`,
        // injection: end
        ctx.config.inject?.(createInjectContext('end')),
    ];
    return {
        ref,
        title: pascalCase(enumeration.name),
        description: enumeration.docs?.[0],
        pathSegments: ctx.registry.lookup(ref).pathSegments,
        content: parts.filter(Boolean).join(BLOCK_SEPARATOR),
    };
}

/** One `## <group>` section: alphabetical within the group, code-wrapped links with a ` - <docs[0]>` tail. */
function renderGroup(group: CategoryGroup, markup: MarkupRenderer, linkTo: (r: DocRef) => string): string | undefined {
    if (!group.items.length) {
        return undefined;
    }
    const sorted = [...group.items].sort((a, b) => refName(a.ref).localeCompare(refName(b.ref)));
    const lines = markup.list(
        'bulleted',
        sorted.map(({ ref, docs }) => withBlurb(markup, linkedEntity(ref, markup, linkTo), docs)),
    );
    return `${markup.heading(2, GROUP_TITLES[group.kind])}${BLOCK_SEPARATOR}${lines}`;
}

export function renderCategoryIndexPage(category: CategorySpec, ctx: RenderCtx): DocPage {
    const { markup } = ctx;
    const ref: DocRef = { kind: 'categoryIndex', category: category.name };
    const { linkTo, createInjectContext } = createPageContext(ctx, ref, { kind: 'categoryIndex', category });
    const parts: (string | undefined)[] = [
        // header: PascalCased category name (e.g. pdaSeed -> PdaSeed)
        markup.heading(1, pascalCase(category.name)),
        // description
        renderSpecDocs(category.docs, markup),
        // injection: afterDescription
        ctx.config.inject?.(createInjectContext('afterDescription')),
        // body: one section per non-empty group
        ...categoryGroups(category).map(group => renderGroup(group, markup, linkTo)),
        // injection: end
        ctx.config.inject?.(createInjectContext('end')),
    ];
    return {
        ref,
        title: pascalCase(category.name),
        description: category.docs?.[0],
        pathSegments: ctx.registry.lookup(ref).pathSegments,
        content: parts.filter(Boolean).join(BLOCK_SEPARATOR),
    };
}

export function renderRootIndexPage(spec: Spec, ctx: RenderCtx): DocPage {
    const { markup } = ctx;
    const ref: DocRef = { kind: 'rootIndex' };
    const { linkTo, createInjectContext } = createPageContext(ctx, ref, { kind: 'rootIndex', spec });
    const title = ctx.config.root?.title ?? DEFAULT_ROOT_TITLE;
    const description = ctx.config.root?.description ?? DEFAULT_ROOT_DESCRIPTION;

    // categories with their own directory, listed alphabetically as PascalCased links
    const categories: ListItem[] = spec.categories
        .filter(category => hasOwnDirectory(ctx.config.pathConfig, category))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(category =>
            withBlurb(
                markup,
                markup.link(pascalCase(category.name), linkTo({ kind: 'categoryIndex', category: category.name })),
                category.docs,
            ),
        );
    // root-level categories (no own directory, e.g. topLevel) get their own section below
    const rootSections = spec.categories
        .filter(category => !hasOwnDirectory(ctx.config.pathConfig, category))
        .map(category => renderRootCategorySection(category, ctx, linkTo));

    const parts: (string | undefined)[] = [
        // header: title
        markup.heading(1, title),
        // description
        markup.paragraph(markup.escape(description)),
        // injection: afterDescription
        ctx.config.inject?.(createInjectContext('afterDescription')),
        // version
        markup.paragraph(`Version ${spec.version}`),
        // body: linked categories
        `${markup.heading(2, 'Categories')}${BLOCK_SEPARATOR}${markup.list('bulleted', categories)}`,
        // body: one section per root-level category (topLevel)
        ...rootSections,
        // injection: end
        ctx.config.inject?.(createInjectContext('end')),
    ];
    return {
        ref,
        title,
        description,
        pathSegments: ctx.registry.lookup(ref).pathSegments,
        content: parts.filter(Boolean).join(BLOCK_SEPARATOR),
    };
}

/** A root-level category (no own directory, e.g. topLevel) as its own section: heading, docs, entity list. */
function renderRootCategorySection(category: CategorySpec, ctx: RenderCtx, linkTo: (r: DocRef) => string): string {
    const { markup } = ctx;
    const entities = categoryGroups(category)
        .flatMap(group => [...group.items].sort((a, b) => refName(a.ref).localeCompare(refName(b.ref))))
        .map(({ ref, docs }) => withBlurb(markup, markup.link(displayName(ref), linkTo(ref)), docs));
    const parts: (string | undefined)[] = [
        // section heading: PascalCased category name (e.g. topLevel -> TopLevel)
        markup.heading(2, pascalCase(category.name)),
        // category description
        renderSpecDocs(category.docs, markup),
        // entity links with blurbs
        markup.list('bulleted', entities),
    ];
    return parts.filter(Boolean).join(BLOCK_SEPARATOR);
}

/** One Type-column cell: the rendered type, plus an ` _(optional)_` suffix when the attribute is optional. */
function typeCell(attribute: AttributeSpec, markup: MarkupRenderer, linkTo: (ref: DocRef) => string): string {
    const base = renderType(attribute.type, markup, linkTo);
    return attribute.optional ? `${base} ${markup.italic('(optional)')}` : base;
}

/**
 * The short blurb for a table cell or list line - the first doc paragraph only, '' when there are none.
 * Only `docs[0]` is used on purpose: tables and lists want a one-line summary, so other paragraphs are dropped.
 * The full multi-paragraph docs still render on the entity's own page via `renderSpecDocs`.
 */
function getFirstDoc(markup: MarkupRenderer, docs?: readonly string[]): string {
    return docs?.[0] ? markup.escape(docs[0]) : '';
}

/** Appends a ` - <first doc paragraph>` suffix to a label (see `getFirstDoc`), or the bare label when there are none. */
function withBlurb(markup: MarkupRenderer, label: string, docs?: readonly string[]): string {
    return docs?.[0] ? `${label} - ${getFirstDoc(markup, docs)}` : label;
}

/** Renders a spec `docs` field (a list of prose paragraphs) as a single space-joined paragraph, '' when empty. */
function renderSpecDocs(docs: readonly string[] | undefined, markup: MarkupRenderer): string {
    return docs?.length ? markup.paragraph(markup.escape(docs.join(' '))) : '';
}
