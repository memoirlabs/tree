# FamilyTree

`FamilyTree` renders a nested `FamilyMember` object with relationship-aware
connectors.

## Data Shape

```ts
type FamilyMember = {
  id: string;
  name: string;
  birthday?: string;
  relation?: RelationType;
  status?: "linked" | "manual" | "invite_pending";
  profileId?: string;
  profileSlug?: string | null;
  parents?: FamilyMember[];
  siblings?: FamilyMember[];
  children?: FamilyMember[];
  spouse?: FamilyMember;
};
```

`relation` is a display label. Layout comes from `parents`, `siblings`,
`children`, and `spouse`.

## Flat Relationship Rows

You do not have to prebuild the nested `FamilyMember` tree. If your database has
a relationship table, pass rows directly:

```tsx
import { FamilyTree } from "@memoir/tree";
import type { RelationshipTableRow } from "@memoir/tree";

const rows: RelationshipTableRow[] = [
  { sourceId: "morgan", sourceLabel: "Morgan", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "casey", sourceLabel: "Casey", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "jordan", targetLabel: "Jordan", type: "spouse" },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "riley", targetLabel: "Riley", type: "parent", targetOrder: 1 },
];

export function Tree() {
  return <FamilyTree relationshipRows={rows} rootId="alex" />;
}
```

The adapter converts flat rows into the nested shape used by the built-in tree.
It also understands reverse rows, so `type: "child"` is normalized into the same
parent-child edge.

## Family Tree Etiquette

The built-in layout follows practical genealogy conventions:

- parents render above the focused person
- children render below the focused person or couple
- spouses render on the same generation row with a horizontal connector
- former spouses are available as graph semantics and should use dashed same-row connectors
- siblings stay on the focused generation row
- children and siblings are sorted by `displayOrder`, `sourceOrder`, or `targetOrder` when present

## Editing

When `canEdit` is true and `onAddMember` is supplied, each default card renders
a plain `Add` button. The callback receives one of these payloads:

```ts
type AddMemberPayload =
  | { type: "existing"; relation: RelationType; parentId?: string; name: string; profileId: string }
  | { type: "manual"; relation: RelationType; parentId?: string; name: string; birthday?: string }
  | { type: "invite"; relation: RelationType; parentId?: string; firstName: string; lastName?: string; email: string };
```

The host app persists the change and passes a new `rootMember`.

## Relation Options

```tsx
<FamilyTree
  rootMember={rootMember}
  canEdit
  relationOptions={(member, isRoot) =>
    isRoot ? ["parent", "sibling", "spouse", "former_spouse", "child"] : ["child"]
  }
/>
```

## Custom Rendering

Use `renderNode` when the default unstyled card is too minimal:

```tsx
<FamilyTree
  rootMember={rootMember}
  renderNode={(member, options) => (
    <article className={options.isRoot ? "root-card" : "member-card"}>
      <strong>{member.name}</strong>
      {options.canEdit ? (
        <button onClick={() => options.onAddMember("child", member.id)}>Add child</button>
      ) : null}
    </article>
  )}
/>
```

The wrapper containing your rendered node still gets `data-family-node-id`.
Connectors depend on that invariant.
