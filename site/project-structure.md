# Project Structure

The repository is organized by purpose:

```text
.
├── src/
│   ├── components/
│   │   ├── add-member-dialog.tsx
│   │   ├── family-tree.tsx
│   │   ├── node-card.tsx
│   │   └── relationship-chart.tsx
│   ├── design-presets.ts
│   ├── index.ts
│   ├── layout.ts
│   ├── relationships.ts
│   ├── schema.ts
│   ├── types.ts
│   └── utils.ts
├── tests/
│   ├── layout.test.ts
│   ├── relationship-chart.test.ts
│   ├── relationships.test.ts
│   └── schema.test.ts
├── scripts/
│   └── fix-dist-imports.ts
├── site/
│   ├── *.md
│   ├── index.html
│   ├── playground.tsx
│   ├── server.ts
│   └── styles.css
├── dist/
├── mod.ts
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

## Folder Responsibilities

- `src/`: Published library source.
- `src/components/`: React components only.
- `tests/`: Bun tests for schema, layout, graph traversal, and chart levels.
- `scripts/`: Local build utilities.
- `site/`: Markdown docs and local visual playground. This folder is not published.
- `dist/`: Generated package output.

## Public Entrypoints

- npm package entry: `src/index.ts` -> `dist/index.js`.
- JSR/Deno entry: `mod.ts` -> `src/index.ts`.

## Package Boundary

Only these files ship via npm:

- `dist`
- `README.md`
- `LICENSE`

Tests, scripts, playground code, and markdown docs under `site/` stay local.
