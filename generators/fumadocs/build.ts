import { absoluteLinks, generateDocs } from '../../src/docs';
import type { DocFile, DocModel, PathConfig } from '../../src/docs';
import { getSpec } from '../../src/v1';

const SPEC_TITLE = 'Codama Spec';
const SPEC_DESCRIPTION = 'The canonical Codama node specification.';

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
 * `urlVersion` is the route version segment (`v1`); `pathConfig` decides file/dir names and the index basename.
 */
export function buildSpecModel(urlVersion: string, pathConfig: PathConfig): DocModel {
    return generateDocs(getSpec(), {
        pathConfig,
        linkStrategy: absoluteLinks({
            baseUrl: `/spec/${urlVersion}`,
            extension: '',
            indexFileName: pathConfig.indexFileName,
        }),
        root: { title: SPEC_TITLE, description: SPEC_DESCRIPTION },
    });
}

/**
 * Build the version-root meta.json:
 * - caller `rootMeta` fields (root, title) first
 * - then category folders
 * - then loose top-level pages, both alphabetical.
 */
function buildRootMetaFile(model: DocModel, indexFileName: string, rootMeta: Record<string, unknown>): DocFile {
    const folders = [...new Set(model.pages.filter(p => p.pathSegments.length > 1).map(p => p.pathSegments[0]))].sort();
    const loose = model.pages
        .filter(p => p.pathSegments.length === 1 && p.pathSegments[0] !== indexFileName)
        .map(p => p.pathSegments[0])
        .sort();
    const meta = { ...rootMeta, pages: [...folders, ...loose] };
    return { path: 'meta.json', content: `${JSON.stringify(meta, null, 2)}\n` };
}

/**
 * Build the Fumadocs files from the spec model (Minimal + labels).
 * Paths are relative to the version root.
 * The caller writes them under `content/spec/v1` (gitignored, regenerated at predev/prebuild).
 * `indexFileName` is the PathConfig index basename - the trailing segment that marks a folder landing page.
 * - one `.md` per page (frontmatter + body)
 * - one `{ title }`-only `meta.json` per category folder, so the sidebar shows a clean label (i.e. `Count`, not
 *   `countNodes`).
 * Page order inside the folder is left to Fumadocs (alphabetical)
 * - one root `meta.json` (via `buildRootMetaFile`) merging `rootMeta` (the generator passes
 *   `{ root: true, title: 'v1.8.0' }` so the folder becomes a version-switcher root).
 */
export function buildFumadocFiles(
    model: DocModel,
    indexFileName: string,
    rootMeta: Record<string, unknown> = {},
): DocFile[] {
    const files: DocFile[] = [];

    for (const page of model.pages) {
        const pathKey = page.pathSegments.join('/');
        const front = frontmatter({ title: page.title, description: page.description });
        files.push({ path: `${pathKey}.md`, content: `${front}\n\n${page.content}\n` });
    }

    // per-folder label - the category index page (at `<folder>/<indexFileName>`) carries the PascalCase title
    for (const page of model.pages) {
        const segments = page.pathSegments;
        if (segments.length === 2 && segments[1] === indexFileName) {
            files.push({
                path: `${segments[0]}/meta.json`,
                content: `${JSON.stringify({ title: page.title }, null, 2)}\n`,
            });
        }
    }

    files.push(buildRootMetaFile(model, indexFileName, rootMeta));

    return files;
}
