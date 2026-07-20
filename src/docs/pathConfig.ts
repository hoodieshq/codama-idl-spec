import { pascalCase, refName } from './ref';
import type { PathConfig } from './types';

/**
 * Local-docs path preset:
 * - topLevel shares the docs root.
 * - other categories go under `<name>Nodes`.
 * Files are PascalCase, and index pages are named README.
 *
 * @example
 * buildNavRegistry(LocalDocsPathConfig, spec) files node constantPdaSeedNode at 'pdaSeedNodes/ConstantPdaSeedNode'.
 */
export const LocalDocsPathConfig: PathConfig = {
    categoryDir: c => (c.name === 'topLevel' ? '' : `${c.name}Nodes`),
    fileName: ref => pascalCase(refName(ref)),
    indexFileName: 'README',
};

/**
 * Hosted-docs path preset - identical layout to LocalDocsPathConfig, but index pages are named `index`.
 * Fumadocs treats a folder's `index` file as its landing page, served at the folder URL.
 *
 * @example
 * buildNavRegistry(HostedDocsPathConfig, spec) files the root index at 'index' and pdaSeed's index at 'pdaSeedNodes/index'.
 */
export const HostedDocsPathConfig: PathConfig = {
    categoryDir: c => (c.name === 'topLevel' ? '' : `${c.name}Nodes`),
    fileName: ref => pascalCase(refName(ref)),
    indexFileName: 'index',
};
