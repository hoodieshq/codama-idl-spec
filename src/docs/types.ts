/**
 * Public types for the reusable docs generator.
 *
 * `generate(spec, options)` is pure: it returns an in-memory list of files
 * for a caller to write where it wants (the spec repo writes them to
 * `v1/docs/`; downstream repos write them into their own docs app). Keeping
 * file IO out of this module lets it bundle for any platform.
 */

import type { CategorySpec, NodeSpec, Spec } from '../api';
import type { DocLinkResolver } from './renderTypeExpr';

/** One generated file: a path relative to the docs content root + its body. */
export interface DocFile {
    readonly path: string;
    readonly content: string;
}

/** Context handed to per-node hooks so callers can branch on placement. */
export interface NodePageContext {
    readonly category: CategorySpec;
}

export interface DocsOptions {
    /** Nav root prepended to default cross-reference links (e.g. `/docs`). */
    readonly baseUrl?: string;
    /**
     * Resolve a node/union/enumeration reference to an href, or `null` to
     * render it un-linked. Defaults to linking node references to their
     * generated page under `baseUrl`; un-paged kinds render as plain text.
     */
    readonly linkResolver?: DocLinkResolver;
    /**
     * Append extra MDX after a node page's spec-derived body. This is the
     * language-extension seam: downstream repos inject helper signatures,
     * language-specific examples, etc. Return `null` to add nothing.
     */
    readonly extendNode?: (node: NodeSpec, ctx: NodePageContext) => string | null;
    /** Merge/override frontmatter for a node page (e.g. extra tags). */
    readonly frontmatter?: (node: NodeSpec, ctx: NodePageContext) => Record<string, unknown>;
    /** Standalone pages to emit alongside the generated node reference. */
    readonly extraPages?: readonly DocFile[];
}

/**
 * A docs generator turns a spec into an in-memory set of files. The Fumadocs
 * `generate` is one implementation; a different framework target (Docusaurus,
 * plain Markdown, …) is just another function of this shape. The on-disk
 * writer in `generators/docs/` is agnostic to which one it runs.
 */
export type DocsGenerator = (spec: Spec, options?: DocsOptions) => DocFile[];

/**
 * A framework-agnostic documentation page. `body` is plain Markdown (no
 * frontmatter); a renderer decides how to serialize the metadata and where
 * the file lives. `category` is the containing folder (`''` for the root).
 */
export interface DocPage {
    readonly category: string;
    readonly slug: string;
    readonly title: string;
    readonly description: string;
    /** Extra per-page metadata a renderer may emit (e.g. node frontmatter). */
    readonly meta?: Record<string, unknown>;
    readonly body: string;
}

/** Navigation for one category: an ordered list of page slugs. */
export interface DocCategoryNav {
    readonly name: string;
    readonly title: string;
    readonly pages: readonly string[];
}

/**
 * The framework-agnostic output of `buildModel`: every page plus the
 * category/ordering information a renderer needs to build navigation.
 * Renderers (Fumadocs, Docusaurus, plain Markdown) consume this — only the
 * serialization differs.
 */
export interface DocModel {
    readonly pages: readonly DocPage[];
    readonly categories: readonly DocCategoryNav[];
}

/** A renderer serializes a `DocModel` into files for a specific framework. */
export type DocsRenderer = (model: DocModel) => DocFile[];
