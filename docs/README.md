# Spec documentation

Documentation website for Codama Spec, built with [Fumadocs](https://github.com/fuma-nama/fumadocs).


## Install dependencies

```bash
pnpm i
```

## Run development server

```bash
pnpm dev
```

Open http://localhost:3000 with your browser to see the result.

The `content/spec/` reference is generated from the repo root by `pnpm generate:spec-docs` (run automatically on `predev`/`prebuild`) and is gitignored.

## Project structure

```
docs/
  content/                        # page mdx content
    docs/                         # handwritten guides
    recipes/                      # handwritten recipes
    spec/                         # generated spec reference (gitignored)
  src/
    app/                          # Next.js App Router
      {docs,recipes,spec}/        # one route tree per collection ([[...slug]] + layout)
      api/search/                 # combined Orama search across all collections
      llms.mdx/, llms-full.txt/   # markdown views for AI agents
    lib/
      source.ts                   # per-collection fumadocs sources
      layout.shared.tsx           # nav + shared layout options
      get-llm-text.ts             # page -> markdown for the llms routes
    components/mdx.tsx             # MDX component overrides
  source.config.ts                # fumadocs-mdx collections (docs, recipes, spec)
  next.config.mjs                 # .mdx rewrites + /spec -> /spec/v1 redirect
```

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Fumadocs Documentation](https://www.fumadocs.dev/)
