# Memoir Tree v0.4.9

Unknown partner placeholder routing patch.

## Changes

- Treat partnerships with `relation: "unknown"` or `status: "unknown"` as placeholder/layout facts, not real spouse bars.
- Keep unknown placeholder cards visible without drawing a fake horizontal partner edge.
- Still connect unknown placeholders when they are actually included as parents in the child parentage group.
- Add the unknown-placeholder case to `/visual-check`.
- Document the placeholder rule in README, docs, API notes, and `llms.txt`.

## Verify

- `bun run typecheck`
- `bun test`
- `bun run build`
- `bun run lint`
- `bun run --cwd site ci`
- Browser screenshot and drag metrics on `/visual-check`
