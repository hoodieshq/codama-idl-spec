import { type BaseFragment, createRenderMap, type Path, type RenderMap } from '@codama/fragments';

import type { DocModel, DocPage } from '../../../src/docs';

/** Index page basename - the trailing segment that marks a folder landing page (matches src/docs' scheme). */
const INDEX_FILE_NAME = 'index';

/** The fumadocs version-root meta.json shape - `{ root: true, title: 'v1.8.0' }`. */
interface RootMeta {
    readonly root?: boolean;
    readonly title?: string;
}

/**
 * Build a YAML frontmatter block.
 * Each value is JSON-encoded, which is a valid YAML double-quoted scalar for escaping quotes, colons, `#`, and newlines.
 */
export function frontmatter(fields: Record<string, string | undefined>): string {
    const lines = Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
    return `---\n${lines.join('\n')}\n---`;
}

/**
 * Build the Fumadocs render map from the spec model.
 * Paths are relative to the major version root, so `writeRenderMap` roots the whole tree at one directory.
 *
 * Entries emitted:
 * - One mdx file per page (frontmatter + body)
 * - A `meta.json` with only `{ title }` per category folder, so the sidebar shows `Count`, not `countNodes`.
 * - A root `meta.json` - `{ root: true, title, pages: ['!index', '...'] }` so the folder is a version-switcher root.
 */
export function getFumadocsRenderMap(model: DocModel, rootMeta: RootMeta = {}): RenderMap<BaseFragment> {
    const entries: Record<Path, BaseFragment> = {};

    for (const page of model.pages) {
        const front = frontmatter({ title: page.title, description: page.description });
        // core `content` carries no trailing newline; add one when writing the file
        entries[`${page.pathSegments.join('/')}.mdx`] = { content: `${front}\n\n${page.content}\n` };
    }

    // per-folder label - the category index page carries the PascalCase title
    for (const page of model.pages.filter(isCategoryIndexPage)) {
        entries[`${page.pathSegments[0]}/meta.json`] = jsonFragment({ title: page.title });
    }

    // `!index` hides the landing page from the sidebar, `...` lists every other page on Fumadocs' default sort
    entries['meta.json'] = jsonFragment({ ...rootMeta, pages: ['!index', '...'] });

    return createRenderMap(entries);
}

/** A category landing page - nested inside a folder and named `index`, e.g. `countNodes/index`. */
function isCategoryIndexPage(page: DocPage): boolean {
    const segments = page.pathSegments;
    return segments.length > 1 && segments[segments.length - 1] === INDEX_FILE_NAME;
}

/** A pretty-printed JSON fragment with the trailing newline every emitted file carries. */
function jsonFragment(value: object): BaseFragment {
    return { content: `${JSON.stringify(value, null, 2)}\n` };
}
