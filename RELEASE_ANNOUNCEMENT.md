# @memoir/tree v0.5.2

This patch hardens the `0.5.x` tree package before the Memoir app consumes it.

## What Changed

- Keeps the public root API surface intact and adds regression coverage for the exports the app imports from `@memoir/tree`.
- Adds a compatibility shim for the old family primitive module path while moving the implementation to `FamilyTreePrimitives`.
- Splits family row planning from measured layered layout so relationship grouping, anchor selection, and card measurement live in clearer modules.
- Preserves app-owned org reporting link IDs on rendered edges.
- Preserves org edge `relation` and `status` through graph normalization, indexing, and layout.
- Adds cleaner org helper aliases: `org.manager(...)` and `org.report(...)`, while keeping `org.reports(...)`.
- Adds indexed org relationship lookups so layout traversal does not repeatedly scan every reporting relationship.
- Updates README, site docs, and generated LLM guidance to match the new helper syntax and graph metadata behavior.

## API Compatibility

Existing root imports continue to work:

```ts
import {
  FamilyTree,
  OrgChart,
  TreeCanvas,
  TreeEdges,
  TreeNodeLayer,
  TreeProvider,
  buildFamilyTreeLayout,
  buildOrgChartLayout,
  createFamilyLayoutService,
  createUnionParentLinks,
  layoutFamilyTree,
  rel,
  org,
} from "@memoir/tree";
```

The family lower-level layout service still supports union-owned children, multiple unions for one person, synthetic repair for ungrouped parent links, and add-child flows from a selected union context.

## Verification

- `bun run typecheck`
- `bun test`
- `bun run lint`
- `bun run build`
- `bun run --cwd site ci`
- `bun run npm:pack`

Compare changes: https://github.com/memoirlabs/tree/compare/v0.5.1...v0.5.2
