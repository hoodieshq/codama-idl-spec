# @codama/spec-docs

The canonical Codama node-reference site, built with [Fumadocs](https://fumadocs.dev) (Next.js).

It is **not published** — it consumes the generated `v1/docs/` MDX produced by
the repo-root `pnpm generate` (which runs the reusable `@codama/spec/docs`
generator). `source.config.ts` points `dir` at `../../v1/docs`, so there is no
copy step: regenerate the spec docs, then build the site.

## Develop

```sh
# from the repo root, refresh v1/docs/ first
pnpm generate

# then run the site
pnpm --filter @codama/spec-docs dev
```

## Build

```sh
pnpm generate                       # repo root — refresh v1/docs/
pnpm --filter @codama/spec-docs build
```

## How it fits together

`src/v1/nodes/*.ts` → `pnpm generate` → `v1/docs/*.mdx` → this site renders it.
The same `@codama/spec/docs` generator is reused downstream (codama-js) with an
`extendNode` hook to layer language-specific docs on top of this reference.
