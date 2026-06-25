/**
 * `@codama/spec/docs` — reusable spec → Fumadocs MDX generator.
 *
 * `generate(spec, options)` returns in-memory `DocFile`s; callers write them
 * wherever their docs app expects. Downstream repos extend per-node output
 * via `options.extendNode` to layer language-specific material on top of the
 * canonical node reference.
 */

export { buildModel, generate, generate as fumadocsGenerator, renderFumadocs } from './generate';
export { pascal, renderTypeExpr } from './renderTypeExpr';
export type { DocLinkResolver } from './renderTypeExpr';
export type {
    DocCategoryNav,
    DocFile,
    DocModel,
    DocPage,
    DocsGenerator,
    DocsOptions,
    DocsRenderer,
    NodePageContext,
} from './types';
