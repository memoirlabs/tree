# Playground

The playground is a local-only visual harness used to test the library in a
real browser.

## Run

```bash
bun run playground
```

Open `http://localhost:4321`.

## What It Covers

- Ergonomic `FamilyTree` with `subject`, `people`, `relationships`, and `card`.
- App-owned custom cards.
- Connector rendering without Tailwind.
- `RelationshipChart` in `all` mode.
- `RelationshipChart` in `downstream` mode.
- Family relations: grandparents, parents, siblings, half-siblings, partners, children, grandchildren.
- Org relations: CEO, managers, reports, assistant.

## Package Boundary

The playground lives in `site/playground/`. It is not included in `package.json` `files`,
so it does not ship in the published package.

The public package output is limited to:

- `dist`
- `README.md`
- `LICENSE`

## Visual Checks

Use the browser tools to capture screenshots after changes. Check:

- No blank space caused by SVG layout.
- Connectors are visible without host design tokens.
- No app errors in the console.
- Relationship chart levels are ordered correctly.
