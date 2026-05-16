# @memoir/tree Site

This is the single website for `@memoir/tree`.

- `/` is the library landing page with the live playground.
- `/docs` is the Fumadocs documentation.
- `content/docs/` contains the MDX docs.
- `components/playground.tsx` embeds examples that import the local library source from `../src`.

Run development server:

```bash
bun run dev
```

Open http://localhost:3000 with your browser to see the result.

## Commands

```bash
bun run dev
bun run types:check
bun run lint
bun run build
```

## Structure

| Path | Purpose |
| --- | --- |
| `app/(home)/page.tsx` | Landing page |
| `app/docs` | Fumadocs routes and layout |
| `components/playground.tsx` | Embedded homepage playground |
| `content/docs` | Fumadocs MDX content |
| `lib/source.ts` | Fumadocs source loader |
