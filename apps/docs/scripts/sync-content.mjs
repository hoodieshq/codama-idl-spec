// Copy the generated node reference (repo-root `v1/docs/`) into this app's
// content tree. fumadocs-mdx writes compiled `.mdx.js` companions next to the
// source MDX, so the content must live under this `"type": "module"` package
// rather than under the repo-root CommonJS package.
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../../v1/docs');
const dest = path.resolve(here, '../content/docs');

await rm(dest, { force: true, recursive: true });
await cp(src, dest, { recursive: true });
process.stdout.write(`synced ${src} -> ${dest}\n`);
