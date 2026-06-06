# Memoir Tree v0.4.7

Layout and viewport correctness patch.

## Changes

- Center uncontrolled family trees on `subject` and org charts on `root` by default, while still honoring `defaultViewport` and explicit `initialViewport`.
- Keep `resetViewport()` aligned with the same initial-position resolver.
- Recompute family layout bounds from final card positions after subject centering, preventing right-side edge/canvas clipping.
- Balance multi-partner subject rows and route visible adjacent partner bars.
- Add explicit org graph input via `OrgChartGraph` and `graphToOrgReportingRelationships`.
- Document simple vs graph input modes for family trees and org charts.

## Verify

- `bun run typecheck`
- `bun test`
- `bun run build`
- `bun run lint`
- `bun run --cwd site ci`
