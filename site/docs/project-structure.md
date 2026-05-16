# Project Structure

The repository is organized by purpose:

```text
.
├── src/
│   ├── FamilyTree.tsx
│   ├── RelationshipChart.tsx
│   ├── adapters.ts
│   ├── family-index.ts
│   ├── index.ts
│   ├── layout.ts
│   ├── rel.ts
│   ├── relationships.ts
│   ├── types.ts
│   └── utils.ts
├── tests/
│   ├── adapters.test.ts
│   ├── family-index.test.ts
│   ├── layout.test.ts
│   ├── rel.test.ts
│   ├── relationship-chart.test.ts
│   └── relationships.test.ts
├── scripts/
│   └── fix-dist-imports.ts
├── site/
│   ├── docs/
│   │   └── *.md
│   ├── playground/
│   │   ├── README.md
│   │   └── playground.tsx
│   ├── README.md
│   ├── index.html
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
- `src/FamilyTree.tsx`: Ergonomic family tree renderer.
- `src/RelationshipChart.tsx`: Generic org/relationship chart renderer.
- `src/family-index.ts`: Relationship fact indexing and subject-relative labels.
- `src/layout.ts`: Measured family layout and SVG edge routing.
- `tests/`: Bun tests for helpers, layout, graph traversal, and chart levels.
- `scripts/`: Local build utilities.
- `site/docs/`: Local markdown docs. This folder is not published.
- `site/playground/`: Local visual playground. This folder is not published.
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
