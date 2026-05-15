# Memoir Tree Docs

This folder is the local documentation and playground workspace for `@memoir/tree`.
It is intentionally outside the published package `files` list, so docs and playground
code do not ship in the npm/JSR package.

## Contents

- [Getting Started](./getting-started.md)
- [Project Structure](./project-structure.md)
- [FamilyTree](./family-tree.md)
- [YAML Schema](./yaml-schema.md)
- [Relationship Graph](./relationship-graph.md)
- [Org Charts](./org-charts.md)
- [Playground](./playground.md)
- [Development](./development.md)
- [Public API](./api.md)

## Local Commands

```bash
bun run check
bun run playground
```

`bun run check` runs oxlint, TypeScript, tests, and the production build.
`bun run playground` starts the local visual harness at `http://localhost:4321`.
