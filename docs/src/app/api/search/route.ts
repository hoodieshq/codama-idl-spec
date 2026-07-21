import { createSearchAPI } from 'fumadocs-core/search/server';
// docs/recipes hidden for now - re-add their imports + index blocks below to restore.
import { specSource } from '@/lib/source';

// createFromSource only indexes one source, so build a combined advanced index
// over all three collections. The `tag` lets the UI filter by section.
export const { GET } = createSearchAPI('advanced', {
  language: 'english',
  indexes: [
    // ...docsSource.getPages().map((page) => ({
    //   id: page.url,
    //   url: page.url,
    //   tag: 'docs',
    //   title: page.data.title,
    //   description: page.data.description,
    //   structuredData: page.data.structuredData,
    // })),
    // ...recipesSource.getPages().map((page) => ({
    //   id: page.url,
    //   url: page.url,
    //   tag: 'recipes',
    //   title: page.data.title,
    //   description: page.data.description,
    //   structuredData: page.data.structuredData,
    // })),
    ...specSource.getPages().map((page) => ({
      id: page.url,
      url: page.url,
      tag: 'spec',
      title: page.data.title,
      // No `description`: spec pages repeat docs[0] as both frontmatter description and the body
      // lead paragraph, so indexing description would duplicate a structuredData text node in results.
      structuredData: page.data.structuredData,
    })),
  ],
});
