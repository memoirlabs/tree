# Memoir Tree Release v0.8.0

Version 0.8.0 makes family relationship labels precise, accessible, and easier for applications to customize without changing structural tree data.

## Highlights

- Removes the misleading `partner-parent` computed relationship.
- Represents a spouse's or partner's parent as `parent` with `side: "other"`, keeping it distinct from a direct ancestor without exposing awkward wording.
- Adds `getRelationLabel` for context-aware accessible relationship wording.
- Adds `formatFamilyRelationLabel` and `getDefaultFamilyRelationLabel` as public formatting helpers.
- Carries explicit unknown-slot metadata and placement context through family cards and action callbacks.
- Uses `slotRole: "parent"` for dotted missing-parent cards so default cards and accessible labels describe them as parents.
- Humanizes default card labels such as `half-sibling`, `aunt-uncle`, and `niece-nephew`.

## Breaking Change

`ComputedRelationLabel` no longer includes `partner-parent`. Consumers that matched that value should handle `label: "parent"` with `side: "other"` instead.

Actual spouse, partner, and co-parent relationships remain fully supported.

## Install

```bash
bun add @memoir/tree@0.8.0
```

## Validation

- 114 package tests passed.
- Lint and TypeScript checks passed.
- Package and documentation-site production builds passed.
- Published package contents passed the npm package audit.

Compare changes: [v0.7.1...v0.8.0](https://github.com/memoirlabs/tree/compare/v0.7.1...v0.8.0)
