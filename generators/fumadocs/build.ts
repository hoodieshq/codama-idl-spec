import { generateDocs, relativeLinks } from '../../src/docs';
import type { DocFile, DocModel, PathConfig } from '../../src/docs';
import { getSpec } from '../../src/v1';

const SPEC_TITLE = 'Codama Spec';
const SPEC_DESCRIPTION = 'The canonical Codama node specification.';

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
 * Build the hosted spec model - the single source of generator config, shared by `generate()` and any test.
 * `pathConfig` decides file/dir names and the index basename.
 * Links are relative `.mdx` paths - the docs app's `createRelativeLink` rewrites them to route URLs at render time,
 * so pages carry no route/version prefix and stay portable across mount points.
 */
export function buildSpecModel(pathConfig: PathConfig): DocModel {
    return generateDocs(getSpec(), {
        pathConfig,
        linkStrategy: relativeLinks('mdx'),
        root: { title: SPEC_TITLE, description: SPEC_DESCRIPTION },
    });
}

/**
 * Build the version-root meta.json - `{ root, title, pages: ['!index', '...'] }`.
 * `!index` hides the landing page from the sidebar, `...` lists every other page on Fumadocs' default sort.
 */
function buildRootMetaFile(rootMeta: RootMeta): DocFile {
    const meta = { ...rootMeta, pages: ['!index', '...'] };
    return { path: 'meta.json', content: `${JSON.stringify(meta, null, 2)}\n` };
}

/**
 * Build the Fumadocs files from the spec model.
 * Paths are relative to the major version root.
 * `indexFileName` is the PathConfig index basename - the trailing segment that marks a folder landing page.
 *
 * Files emitted:
 * - One mdx file per page (frontmatter + body)
 * - A `meta.json` with only `{ title }` per category folder, so the sidebar shows `Count`, not `countNodes`.
 * - A root `meta.json` - `{ root: true, title, pages: ['!index', '...'] }` so the folder is a version-switcher root.
 */
export function buildFumadocFiles(model: DocModel, indexFileName: string, rootMeta: RootMeta = {}): DocFile[] {
    const files: DocFile[] = [];

    for (const page of model.pages) {
        const pathKey = page.pathSegments.join('/');
        const front = frontmatter({ title: page.title, description: page.description });
        files.push({ path: `${pathKey}.mdx`, content: `${front}\n\n${page.content}\n` });
    }

    // per-folder label - the category index page (at `<folder>/<indexFileName>`) carries the PascalCase title
    for (const page of model.pages) {
        const segments = page.pathSegments;
        if (segments.length > 1 && segments[segments.length - 1] === indexFileName) {
            files.push({
                path: `${segments[0]}/meta.json`,
                content: `${JSON.stringify({ title: page.title }, null, 2)}\n`,
            });
        }
    }

    files.push(buildRootMetaFile(rootMeta));

    return files;
}
