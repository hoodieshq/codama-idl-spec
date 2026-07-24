/**
 * `docs` generator.
 *
 * Runs the docs generator over the v1 spec, then writes the emitted mdx tree to
 * `v1/docs/` (plain page bodies, relative `.mdx` links, `index` basenames). CI re-runs this and fails if
 * the result differs from what is committed, keeping the docs artifact in lockstep with the spec source.
 *
 * The same model also feeds the Fumadocs app tree under `docs/content/spec/<major>/`, which adds YAML
 * frontmatter per page plus the `meta.json` sidecars the sidebar needs.
 *
 * Both trees are assembled as a `RenderMap` and handed to the fragments writers, so nothing here touches
 * `node:fs`: `deleteDirectory` clears the target first, `writeRenderMap` creates directories on demand.
 */

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
    type BaseFragment,
    createRenderMap,
    deleteDirectory,
    joinPath,
    type Path,
    type RenderMap,
    writeFile,
    writeRenderMap,
} from '@codama/fragments';

import { type DocModel, generateDocs } from '../../src/docs';
import { getSpec, SPEC_VERSION } from '../../src/v1';
import { getFumadocsRenderMap } from './fumadocs/build';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// here = <repo>/generators/docs -> repoRoot is two levels up.
const REPO_ROOT = path.resolve(HERE, '../..');
const URL_VERSION = `v${SPEC_VERSION.split('.')[0]}`;
const VERSION_LABEL = `v${SPEC_VERSION}`;

function getDocsRenderMap(model: DocModel): RenderMap<BaseFragment> {
    const entries: Record<Path, BaseFragment> = {};
    for (const page of model.pages) {
        // core `content` carries no trailing newline; add one when writing the file
        entries[`${page.pathSegments.join('/')}.mdx`] = { content: `${page.content}\n` };
    }
    return createRenderMap(entries);
}

export function generate(): void {
    const model = generateDocs(getSpec());

    // plain mdx artifact - cleared first so removed or renamed nodes never leave orphaned files behind
    const docsMap = getDocsRenderMap(model);
    const docsOutDir = joinPath(REPO_ROOT, 'v1', 'docs');
    deleteDirectory(docsOutDir);
    writeRenderMap(docsMap, docsOutDir);
    process.stdout.write(`wrote ${docsMap.size} docs files to v1/docs\n`);

    // Fumadocs app contents - the same pages with frontmatter, plus the sidebar meta.json sidecars
    const fumadocsMap = getFumadocsRenderMap(model, { root: true, title: VERSION_LABEL });
    const fumadocsOutDir = joinPath(REPO_ROOT, 'docs', 'content', 'spec', URL_VERSION);
    deleteDirectory(fumadocsOutDir);
    writeRenderMap(fumadocsMap, fumadocsOutDir);
    process.stdout.write(`wrote ${fumadocsMap.size} spec pages and meta to docs/content/spec/${URL_VERSION}\n`);

    // Full spec version manifest for the docs app - next.config.mjs derives the /spec redirect major from it.
    // Committed (docs root, outside content/spec's gitignore) so the config resolves it on a fresh clone.
    writeFile(
        joinPath(REPO_ROOT, 'docs', 'spec-version.json'),
        `${JSON.stringify({ version: SPEC_VERSION }, null, 2)}\n`,
    );
}
