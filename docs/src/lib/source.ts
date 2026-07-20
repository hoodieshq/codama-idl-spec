import { docs, recipes, spec } from 'collections/server';
import { loader } from 'fumadocs-core/source';

export const docsSource = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

export const recipesSource = loader({
  baseUrl: '/recipes',
  source: recipes.toFumadocsSource(),
});

export const specSource = loader({
  baseUrl: '/spec',
  source: spec.toFumadocsSource(),
});
