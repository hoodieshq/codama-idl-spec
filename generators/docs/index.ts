/**
 * `docs` generator (on-disk writer).
 *
 * Framework-agnostic: it asks a selected docs generator for an in-memory set
 * of `DocFile`s and writes them under `v1/docs/`. The generator is what knows
 * the target framework — the default `fumadocs` target emits MDX + `meta.json`;
 * register another target (Docusaurus, plain Markdown, …) in `GENERATORS` and
 * select it with the `DOCS_GENERATOR` env var. The writing logic below does
 * not change.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { fumadocsGenerator } from '../../src/docs';
import type { DocFile, DocsGenerator } from '../../src/docs';
import { getSpec as getV1Spec } from '../../src/v1';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// here = <repo>/generators/docs → repoRoot is two levels up.
const REPO_ROOT = path.resolve(HERE, '../..');

/** Available framework targets, keyed by the name passed via `DOCS_GENERATOR`. */
const GENERATORS: Record<string, DocsGenerator> = {
    fumadocs: fumadocsGenerator,
};

const DEFAULT_GENERATOR = 'fumadocs';

/** Write a generator's files under `outDir`, replacing any previous output. */
async function writeDocFiles(files: readonly DocFile[], outDir: string): Promise<void> {
    await rm(outDir, { force: true, recursive: true });
    for (const file of files) {
        const dest = path.join(outDir, file.path);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, file.content, 'utf8');
    }
}

export async function generate(): Promise<void> {
    const name = process.env.DOCS_GENERATOR ?? DEFAULT_GENERATOR;
    const generator = GENERATORS[name];
    if (!generator) {
        throw new Error(`unknown docs generator '${name}' (known: ${Object.keys(GENERATORS).join(', ')})`);
    }

    const outDir = path.join(REPO_ROOT, 'v1', 'docs');
    const files = generator(getV1Spec());
    await writeDocFiles(files, outDir);

    process.stdout.write(`wrote ${path.relative(REPO_ROOT, outDir)} via '${name}' (${files.length} files)\n`);
}
