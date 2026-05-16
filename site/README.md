# Memoir Tree Docs

This folder is the local documentation and playground workspace for `@memoir/tree`.
It is intentionally outside the published package `files` list, so docs and playground
code do not ship in the npm/JSR package.

## Contents

### Docs

- [Getting Started](./docs/getting-started.md)
- [Project Structure](./docs/project-structure.md)
- [FamilyTree](./docs/family-tree.md)
- [Relationship Graph](./docs/relationship-graph.md)
- [Org Charts](./docs/org-charts.md)
- [Development](./docs/development.md)
- [Public API](./docs/api.md)

### Playground

- [Playground Guide](./playground/README.md)

## Local Commands

```bash
bun run check
bun run playground
```

`bun run check` runs oxlint, TypeScript, tests, and the production build.
`bun run playground` starts the local visual harness at `http://localhost:4321`.
