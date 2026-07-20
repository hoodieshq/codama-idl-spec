/**
 * `fumadocs` generator.
 *
 * Runs the docs generator over the v1 spec.
 * Writes `.md` (frontmatter + body), `meta.json` into `docs/content/spec/<version>`.
 * The version folder is the spec major (`v1`), so pages route under `/spec/v1/...`.
 * Its meta.json is marked `root: true` with the full-semver label so Fumadocs renders a version switcher.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { HostedDocsPathConfig } from '../../src/docs';
import { SPEC_VERSION } from '../../src/v1';
import { buildFumadocFiles, buildSpecModel } from './build';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// here = <repo>/generators/fumadocs -> repoRoot is two levels up.
const REPO_ROOT = path.resolve(HERE, '../..');
// URL segment is the stable major (v1); the switcher label carries the full semver (v1.8.0).
const URL_VERSION = `v${SPEC_VERSION.split('.')[0]}`;
const VERSION_LABEL = `v${SPEC_VERSION}`;

export async function generate(): Promise<void> {
    const model = buildSpecModel(URL_VERSION, HostedDocsPathConfig);
    // clear only this version's subtree - other versions and handwritten content/docs, content/recipes stay untouched
    const outDir = path.join(REPO_ROOT, 'docs', 'content', 'spec', URL_VERSION);
    await rm(outDir, { recursive: true, force: true });
    for (const file of buildFumadocFiles(model, HostedDocsPathConfig.indexFileName, {
        root: true,
        title: VERSION_LABEL,
    })) {
        const abs = path.join(outDir, file.path);
        await mkdir(path.dirname(abs), { recursive: true });
        await writeFile(abs, file.content, 'utf8');
    }
    process.stdout.write(`wrote ${model.pages.length} spec pages to docs/content/spec/${URL_VERSION}\n`);
}
