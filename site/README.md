# @memoir/tree Site

This is the single website for `@memoir/tree`, a lightweight React family-tree library with custom cards, CSS-variable styling, panning controls, accessibility props, explicit structural slot metadata, and bounded family neighborhoods.

- `/` is the library landing page with a simple rendered family tree demo.
- `/docs` is the Fumadocs documentation.
- `content/docs/` contains the MDX docs.
- `components/simple-family-tree-demo.tsx` embeds the homepage example. Site imports use the published `@memoir/tree` package version declared in `package.json`.
- Keep docs aligned with root `README.md` and `AGENTS.md` whenever the API changes.

Run development server:

```bash
bun run dev
```

Open http://localhost:3000 with your browser to see the result.

## Commands

```bash
bun run dev
bun run types:check
bun run lint
bun run build
```

## Structure

| Path | Purpose |
| --- | --- |
| `app/(home)/page.tsx` | Landing page |
| `app/docs` | Fumadocs routes and layout |
| `components/simple-family-tree-demo.tsx` | Embedded homepage demo |
| `content/docs` | Fumadocs MDX content, including getting started, FamilyTree, design, Org Chart, API, and contributor docs |
| `lib/source.ts` | Fumadocs source loader |
