# @memoir/tree v0.5.1

This patch tightens the `0.5.0` family layout release before the app consumes it.

## What Changed

- Keeps direct `children` and `grandchildren` neighborhood fields semantically direct when lateral family expansion is enabled.
- Keeps lateral relatives in their own fields: `auntsUncles`, `cousins`, and `niecesNephews`.
- Preserves the `0.5.0` layout behavior where visible lateral branches can render once `lateralFamilyGenerations` is enabled.
- Adds regression coverage so sibling children and cousin branches do not leak into direct descendant metadata.

## Why It Matters

Memoir app code uses layout metadata to drive add-member actions. Direct descendants and lateral relatives must remain separate even when they share a rendered row. This patch makes that contract explicit and tested.

## Verification

- `bun run typecheck`
- `bun test`
- `bun run lint`
- `bun run build`

Compare changes: https://github.com/memoirlabs/tree/compare/v0.5.0...v0.5.1
