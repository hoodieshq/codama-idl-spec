/** Render-time string constants shared across page renderers - titles, defaults, and block delimiters in one place. */
import type { CodeLanguage } from '../../api';
import type { CategoryGroup } from '../types';

/** Blank line between rendered blocks (headings, tables, paragraphs). */
export const BLOCK_SEPARATOR = '\n\n';

/** Root-page title. */
export const ROOT_TITLE = 'Codama Spec';

/** Root-page description. */
export const ROOT_DESCRIPTION = 'The canonical Codama node specification.';

/** The display heading for each category group kind - a rendering concern, kept out of the CategoryGroup data. */
export const GROUP_TITLES: Record<CategoryGroup['kind'], string> = {
    node: 'Nodes',
    union: 'Unions',
    nestedUnion: 'Nested unions',
    enumeration: 'Enumerations',
};

/** Human-facing tab labels per language - used as the `tab="<label>"` fence meta so Fumadocs groups blocks into tabs. */
export const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
    typescript: 'TypeScript',
    rust: 'Rust',
};

/** Indentation unit for one list-nesting level (markdown convention: 4 spaces). */
export const LIST_INDENT = '    ';

/** Separator between rendered list lines (each item, and an item from its nested sub-list, sits on its own line). */
export const LIST_LINE_SEPARATOR = '\n';
