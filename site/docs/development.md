# Development

This project uses Bun, TypeScript, oxlint, and Bun's test runner.

## Commands

```bash
bun run lint
bun run typecheck
bun test
bun run build
bun run check
```

`bun run check` is the full local quality gate:

1. `oxlint .`
2. `tsc --noEmit`
3. `bun test`
4. `bun run build`

## Build

The build intentionally avoids `tsup` and esbuild.

```bash
rm -rf dist
tsc -p tsconfig.build.json
bun scripts/fix-dist-imports.ts
```

TypeScript emits ESM and declarations. The Bun script rewrites local generated
ESM imports to include `.js` extensions so `dist/index.js` works in Node-style
ESM environments.

## Source Layout

Published source lives under `src/`. Tests live under `tests/`. Markdown docs
live under `site/docs/`, and the visual playground lives under `site/playground/`.
Keep root-level TypeScript limited to
entry/config compatibility files like `mod.ts`.

See [Project Structure](./project-structure.md) for the full tree.

## Tests

Tests are focused on pure behavior:

- Relationship helper rows.
- Subject-centered family indexing.
- Measured layout derivation.
- Relationship graph traversal.
- Relationship chart level building.

## Linting

Oxlint is the only linter. Keep `bun run lint` at zero warnings.

## Browser Verification

After layout or rendering changes:

1. Run `bun run playground`.
2. Open `http://localhost:4321`.
3. Inspect the console.
4. Capture screenshots of the family tree and org chart sections.
