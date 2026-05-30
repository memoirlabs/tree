# Memoir Tree Release v0.4.0

Tree 0.4 adds graph mode for real family-tree data.

## Highlights

- Added `FamilyTree graph={...}` as the recommended family API for production apps.
- Added `FamilyGraph`, `FamilyPartnershipGroup`, `FamilyParentChildLink`, and `FamilyGuardianshipLink` public types.
- Added `graphToFamilyRelationships(graph)` for compatibility with existing indexing/layout helpers.
- Preserved simple mode with `people`, `subject`, `relationships`, and the existing `rel` helpers.
- Added card placement metadata for partnership groups, parent-child links, guardianship links, and visible relationship IDs.
- Kept semantic edges link-aware, so biological, step, adoptive, and guardian links do not collapse into one generic edge.

## Migration Notes

Simple relationship mode still works. Apps with real family structure should migrate to graph mode:

- Use `partnershipGroups` for spouse, partner, and co-parent clusters.
- Use `parentChildLinks` for each individual parent-to-child lineage.
- Use `guardianshipLinks` for guardian or foster guardian relationships.
- Keep persistence, permissions, editing, invites, routing, and validation in your app.

## Verification

- `bun run check`
- `bun run build`
- `bun scripts/release.ts --dry-run --allow-dirty --skip-github`
