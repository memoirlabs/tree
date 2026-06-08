# Memoir Tree Layout Engine Rebuild Plan

## 0. Goal

Build a family tree layout engine that is simple to call, deterministic, robust on malformed or complex family data, and visually clean for real-world genealogy cases.

The engine must support:

- People.
- Unions as real objects.
- Unions with children.
- One person in multiple unions.
- Single-parent unions.
- Unknown-parent or unknown-partner placeholders.
- Adoptive, step, foster, guardian, biological, and unknown parent links.
- Root-centered or full-tree layout.
- Subject-centered neighborhood layout when needed.
- Disconnected components.
- Cycles degraded with warnings instead of layout failure.
- Pure layout output independent of React.
- React rendering as a dumb view over computed nodes, edges, and bounds.

The central architectural correction:

```txt
family tree layout = person nodes + union nodes + ranked block layout + compacted coordinates + routed orthogonal edges
```

Not:

```txt
family tree layout = people rows + relationship metadata + guessed spouse/parent edges after the fact
```

---

# 1. Current Problem

The current package is close conceptually but wrong structurally.

It already has:

```txt
people
relationships
partnership groups
parent-child links
guardianship links
subject-centered layout
layered box layout
edge routing
React components
CSS
```

But the layout currently behaves like:

```txt
normalize graph
collect relatives around subject
create rows
group row items
place row boxes
shift subject to center
route relationship edges afterward
```

That is not enough for real family trees.

The core weaknesses:

1. Unions are not first-class geometry nodes.
2. Parent/partner/child edges are routed after cards are placed.
3. Layout is subject-neighborhood-first, not graph-first.
4. Multiple unions are handled as row ordering tricks.
5. Child groups are attached to parent cards, not to actual union objects.
6. The layout is mostly one-pass top-down anchoring.
7. It does not truly solve subtree blocks.
8. It does not globally compact family branches.
9. It cannot reliably keep one person participating in multiple unions clean.
10. It can visually fail even when the relationship data is valid.

The replacement engine should not preserve legacy behavior. Keep the package name, but replace the internal family layout system.

---

# 2. Package Strategy

Use one package:

```txt
@memoir/tree
```

Do not create separate packages yet.

Correct internal split:

```txt
src/
  index.ts

  layout/
    family/
      types.ts
      normalize.ts
      graph.ts
      rank.ts
      order.ts
      blocks.ts
      compact.ts
      route.ts
      validate.ts
      layout.ts
      index.ts

    geometry/
      point.ts
      box.ts
      bounds.ts
      path.ts

  react/
    family/
      FamilyTree.tsx
      FamilyTreeCanvas.tsx
      FamilyTreeEdges.tsx
      FamilyTreeNodeLayer.tsx
      DefaultFamilyCard.tsx
      index.ts

  styles/
    tree.css
```

Hard rule:

```txt
layout/ has zero React imports.
react/ has zero layout logic.
styles/ has zero data logic.
```

The React component calls the layout function and renders the result.

---

# 3. Public API

## 3.1 Basic React API

```tsx
import { FamilyTree } from "@memoir/tree";
import "@memoir/tree/styles.css";

const people = {
  alex: { name: "Alex" },
  jordan: { name: "Jordan" },
  morgan: { name: "Morgan" },
  riley: { name: "Riley" },
  casey: { name: "Casey" },
};

const unions = [
  {
    id: "u_alex_jordan",
    partners: ["alex", "jordan"],
    children: ["riley"],
    kind: "marriage",
    status: "current",
  },
  {
    id: "u_alex_morgan",
    partners: ["alex", "morgan"],
    children: ["casey"],
    kind: "coparent",
    status: "former",
  },
];

export function App() {
  return (
    <FamilyTree
      people={people}
      unions={unions}
      center="alex"
    />
  );
}
```

That should be the main usage.

No required relationship helper DSL.

No required parent-child link table for common cases.

No required old graph adapter.

The easiest input should be:

```txt
people + unions
```

because a union can own its children.

---

## 3.2 Pure Layout API

```ts
import { layoutFamilyTree } from "@memoir/tree/layout";

const result = layoutFamilyTree({
  people,
  unions,
  center: "alex",
});
```

Output:

```ts
{
  nodes,
  people,
  unions,
  edges,
  bounds,
  warnings
}
```

This lets the layout engine be used by React, SVG, Canvas, server-side screenshot generation, editor previews, tests, and future non-React renderers.

---

# 4. Data Model

## 4.1 Core IDs

```ts
export type PersonId = string;
export type UnionId = string;
export type FamilyNodeId = PersonId | UnionId;
```

---

## 4.2 People

Use app-owned person data.

```ts
export type PeopleById<Person = unknown> = Record<PersonId, Person>;
```

Example:

```ts
const people = {
  alex: { name: "Alex", birthYear: 1980 },
  jordan: { name: "Jordan", birthYear: 1982 },
};
```

The layout engine should not require a specific person schema.

Optional accessor support can be added later:

```ts
getPersonOrder?: (person: Person, id: PersonId) => number | undefined;
getPersonBirthYear?: (person: Person, id: PersonId) => number | undefined;
getPersonLabel?: (person: Person, id: PersonId) => string;
```

But the engine must work without those.

---

## 4.3 Unions

Unions are real layout objects.

```ts
export type FamilyUnion = {
  id: UnionId;

  partners: PersonId[];
  children?: PersonId[];

  kind?: "marriage" | "partnership" | "coparent" | "unknown";
  status?: "current" | "former" | "divorced" | "separated" | "unknown";

  order?: number;
};
```

Important:

```txt
A union is not just a spouse bar.
A union is the geometric node that owns child branches.
```

Examples:

```ts
{
  id: "u_alex_jordan",
  partners: ["alex", "jordan"],
  children: ["riley", "sam"],
  kind: "marriage"
}
```

```ts
{
  id: "u_alex_unknown",
  partners: ["alex", "unknown_parent_1"],
  children: ["casey"],
  kind: "unknown",
  status: "unknown"
}
```

```ts
{
  id: "u_single_morgan",
  partners: ["morgan"],
  children: ["drew"],
  kind: "unknown"
}
```

A union can have:

```txt
0 partners: rare placeholder / orphan grouping
1 partner: single-parent family
2 partners: normal case
3+ partners: supported as group, rendered as partner cluster
```

The layout engine should not hard-crash on unusual cases.

---

## 4.4 Parent Links

Parent links are optional and only needed for lineage detail.

```ts
export type FamilyParentLink = {
  parent: PersonId;
  child: PersonId;
  union?: UnionId;

  kind?: "biological" | "adoptive" | "step" | "foster" | "guardian" | "unknown";

  order?: number;
};
```

Use cases:

```txt
child belongs to union, but each parent-child link has different lineage kind
```

Example:

```ts
parentLinks: [
  {
    parent: "alex",
    child: "riley",
    union: "u_alex_jordan",
    kind: "biological",
  },
  {
    parent: "jordan",
    child: "riley",
    union: "u_alex_jordan",
    kind: "step",
  },
]
```

If `unions[].children` exists but `parentLinks` does not, synthesize parent links from each partner to each child.

If `parentLinks` exists but union is missing, synthesize a union.

---

## 4.5 Input Type

```ts
export type FamilyLayoutInput<Person = unknown> = {
  people: PeopleById<Person>;

  unions?: FamilyUnion[];

  parentLinks?: FamilyParentLink[];

  root?: FamilyNodeId;

  center?: FamilyNodeId;

  options?: Partial<FamilyLayoutOptions>;
};
```

Use `center` for visual centering.

Use `root` for traversal/generation intent.

Default:

```txt
center = root if root exists
root = center if center exists
otherwise infer graph roots
```

---

## 4.6 Layout Options

```ts
export type FamilyLayoutOptions = {
  mode: "full" | "neighborhood";

  direction: "top-down" | "left-right";

  centerMode: "node" | "union" | "descendant-block";

  maxAncestors: number | null;
  maxDescendants: number | null;
  maxSideBranches: number | null;

  personSize: {
    width: number;
    height: number;
  };

  unionSize: {
    width: number;
    height: number;
  };

  spacing: {
    rank: number;
    person: number;
    sibling: number;
    union: number;
    partner: number;
    component: number;
    padding: number;
  };

  unknownPerson?: {
    enabled: boolean;
    label: string;
  };
};
```

Recommended defaults:

```ts
export const defaultFamilyLayoutOptions: FamilyLayoutOptions = {
  mode: "full",
  direction: "top-down",

  centerMode: "node",

  maxAncestors: null,
  maxDescendants: null,
  maxSideBranches: null,

  personSize: {
    width: 220,
    height: 80,
  },

  unionSize: {
    width: 24,
    height: 24,
  },

  spacing: {
    rank: 96,
    person: 28,
    sibling: 32,
    union: 40,
    partner: 20,
    component: 120,
    padding: 48,
  },

  unknownPerson: {
    enabled: true,
    label: "Unknown",
  },
};
```

---

# 5. Layout Output

## 5.1 Person Node

```ts
export type FamilyPersonLayoutNode<Person = unknown> = {
  kind: "person";
  id: PersonId;

  data: Person;

  x: number;
  y: number;
  width: number;
  height: number;

  rank: number;
  order: number;

  unions: UnionId[];
  parentUnions: UnionId[];
  childUnions: UnionId[];

  synthetic?: boolean;
  hidden?: boolean;
};
```

---

## 5.2 Union Node

```ts
export type FamilyUnionLayoutNode = {
  kind: "union";
  id: UnionId;

  x: number;
  y: number;
  width: number;
  height: number;

  rank: number;
  order: number;

  partners: PersonId[];
  children: PersonId[];

  kindLabel?: FamilyUnion["kind"];
  status?: FamilyUnion["status"];

  synthetic?: boolean;
  hidden: boolean;
};
```

Union nodes can be hidden visually but must exist geometrically.

---

## 5.3 Edge

```ts
export type FamilyLayoutEdge = {
  id: string;

  kind:
    | "partner-union"
    | "union-child"
    | "parent-child"
    | "guardian"
    | "diagnostic";

  from: FamilyNodeId;
  to: FamilyNodeId;

  points: Array<{ x: number; y: number }>;

  path: string;

  relation?: FamilyParentLink["kind"];
  status?: FamilyUnion["status"];

  synthetic?: boolean;
};
```

Primary edge types should be:

```txt
person -> union
union -> child
```

Do not start from decorative spouse bars. Spouse/partner lines are rendered from real person-union geometry.

---

## 5.4 Bounds

```ts
export type FamilyLayoutBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};
```

---

## 5.5 Warnings

```ts
export type FamilyLayoutWarning = {
  code:
    | "missing-person"
    | "duplicate-person"
    | "duplicate-union"
    | "missing-union"
    | "synthetic-union-created"
    | "synthetic-person-created"
    | "cycle-detected"
    | "cycle-edge-hidden"
    | "disconnected-component"
    | "duplicate-child-in-union"
    | "invalid-parent-link"
    | "rank-conflict";

  message: string;

  ids?: string[];
};
```

The layout should return warnings instead of throwing for family-data problems.

Throw only for programmer errors like:

```txt
people is not an object
options.spacing.rank is negative
center id is an impossible type
```

---

## 5.6 Result

```ts
export type FamilyLayoutResult<Person = unknown> = {
  nodes: Array<FamilyPersonLayoutNode<Person> | FamilyUnionLayoutNode>;

  people: FamilyPersonLayoutNode<Person>[];

  unions: FamilyUnionLayoutNode[];

  edges: FamilyLayoutEdge[];

  bounds: FamilyLayoutBounds;

  warnings: FamilyLayoutWarning[];
};
```

---

# 6. Internal Graph Model

Normalize input into a person/union graph.

```ts
type InternalPersonNode<Person = unknown> = {
  kind: "person";
  id: PersonId;
  data: Person;
  synthetic: boolean;
};

type InternalUnionNode = {
  kind: "union";
  id: UnionId;
  partners: PersonId[];
  children: PersonId[];
  kindLabel?: FamilyUnion["kind"];
  status?: FamilyUnion["status"];
  order: number;
  synthetic: boolean;
};

type InternalFamilyEdge =
  | {
      kind: "partner-union";
      from: PersonId;
      to: UnionId;
      order: number;
    }
  | {
      kind: "union-child";
      from: UnionId;
      to: PersonId;
      relation?: FamilyParentLink["kind"];
      order: number;
    };
```

Adjacency indexes:

```ts
type InternalFamilyGraph<Person = unknown> = {
  people: Map<PersonId, InternalPersonNode<Person>>;
  unions: Map<UnionId, InternalUnionNode>;

  edges: InternalFamilyEdge[];

  unionsByPartner: Map<PersonId, UnionId[]>;
  unionsByChild: Map<PersonId, UnionId[]>;
  partnersByUnion: Map<UnionId, PersonId[]>;
  childrenByUnion: Map<UnionId, PersonId[]>;

  parentLinksByChild: Map<PersonId, FamilyParentLink[]>;
  parentLinksByUnion: Map<UnionId, FamilyParentLink[]>;

  warnings: FamilyLayoutWarning[];
};
```

The graph shape:

```txt
person ─────┐
            ├── union ─── child
person ─────┘
```

Examples:

```txt
alex ───────┐
            ├── u_alex_jordan ─── riley
jordan ─────┘
```

```txt
alex ───────┐
            ├── u_alex_morgan ─── casey
morgan ─────┘
```

This one idea fixes most layout issues.

---

# 7. Normalization

File:

```txt
src/layout/family/normalize.ts
```

Purpose:

```txt
turn app input into clean internal graph facts
```

Normalization must:

1. Copy people into a map.
2. Copy unions into a map.
3. Deduplicate people.
4. Deduplicate unions.
5. Ensure every referenced person exists.
6. Create synthetic unknown people when needed.
7. Create synthetic unions for parent links without union ids.
8. Fill union children from parent links.
9. Fill parent links from union children when missing.
10. Remove duplicate edges.
11. Preserve order metadata.
12. Return warnings.

---

## 7.1 Synthetic Person Rule

If a union references a missing person:

```ts
{
  id: "u_alex_unknown",
  partners: ["alex", "unknown_parent"]
}
```

and `unknown_parent` is missing from `people`, create:

```ts
people.unknown_parent = {
  synthetic: true,
  label: "Unknown"
}
```

Warning:

```txt
synthetic-person-created
```

---

## 7.2 Synthetic Union Rule

If parent links say:

```ts
parentLinks: [
  { parent: "alex", child: "riley" },
  { parent: "jordan", child: "riley" },
]
```

and no union id is given, create:

```ts
{
  id: "synthetic_union_alex_jordan_riley",
  partners: ["alex", "jordan"],
  children: ["riley"],
  synthetic: true
}
```

Better deterministic id:

```ts
const syntheticUnionId = `u:${parents.sort().join("+")}->${child}`;
```

For multiple children with same exact parent set:

```txt
u:alex+jordan
```

Children:

```txt
riley, casey, drew
```

Do not create separate unions for every child if parent set is identical and relationship metadata does not require separation.

---

## 7.3 Union Children Rule

If union has children:

```ts
{
  id: "u1",
  partners: ["alex", "jordan"],
  children: ["riley"]
}
```

and no parent links exist, synthesize:

```ts
{ parent: "alex", child: "riley", union: "u1", kind: "unknown" }
{ parent: "jordan", child: "riley", union: "u1", kind: "unknown" }
```

These are internal only.

---

## 7.4 Parent Link Union Rule

If parent links reference a union:

```ts
{ parent: "alex", child: "riley", union: "u1" }
```

then `u1.children` must include `riley`.

If `u1.partners` does not include `alex`, add `alex` to partners with warning:

```txt
invalid-parent-link / repaired-parent-added-to-union
```

Or use stricter behavior:

```txt
create diagnostic warning and still add it because layout must work
```

---

## 7.5 Duplicate Handling

Same union child listed twice:

```ts
children: ["riley", "riley"]
```

Normalize to one and warn.

Same parent link twice:

```ts
{ parent: "alex", child: "riley", union: "u1" }
```

Normalize to one and warn only if useful.

---

# 8. Ranking

File:

```txt
src/layout/family/rank.ts
```

Ranks are vertical layers.

Use doubled integer ranks:

```txt
-4 great-grandparents
-3 grandparent union
-2 grandparents
-1 parent union
 0 center/root person
 1 center/root union
 2 children
 3 child unions
 4 grandchildren
```

Why doubled ranks?

Because union nodes naturally sit between person generations.

---

## 8.1 If Center Exists

If `center` is a person:

```txt
center person rank = 0
its parent unions rank = -1
parents of those unions rank = -2
its child unions rank = +1
children of those unions rank = +2
partners in center's unions rank = 0 when visually paired
```

There is one nuance:

A union directly connected to center can be rank `+1` when it represents center's descendant branch. But a union above center, the union that produced center, is rank `-1`.

So direction matters.

---

## 8.2 Parent and Child Traversal

Use semantic traversal, not generic graph force layout.

For a person:

```txt
incoming union-child edges identify parent unions
outgoing partner-union edges identify child/partner unions
```

Pseudo:

```ts
function assignCenteredRanks(graph, centerId) {
  const ranks = new Map<string, number>();
  const queue = [{ id: centerId, rank: 0 }];

  while (queue.length) {
    const item = queue.shift();
    if (ranks.has(item.id)) continue;

    ranks.set(item.id, item.rank);

    if (isPerson(item.id)) {
      for (const parentUnion of graph.unionsByChild.get(item.id) ?? []) {
        queue.push({ id: parentUnion, rank: item.rank - 1 });

        for (const parent of graph.partnersByUnion.get(parentUnion) ?? []) {
          queue.push({ id: parent, rank: item.rank - 2 });
        }
      }

      for (const childUnion of graph.unionsByPartner.get(item.id) ?? []) {
        queue.push({ id: childUnion, rank: item.rank + 1 });

        for (const child of graph.childrenByUnion.get(childUnion) ?? []) {
          queue.push({ id: child, rank: item.rank + 2 });
        }

        for (const partner of graph.partnersByUnion.get(childUnion) ?? []) {
          if (partner !== item.id) {
            queue.push({ id: partner, rank: item.rank });
          }
        }
      }
    }

    if (isUnion(item.id)) {
      for (const partner of graph.partnersByUnion.get(item.id) ?? []) {
        queue.push({ id: partner, rank: item.rank - 1 });
      }

      for (const child of graph.childrenByUnion.get(item.id) ?? []) {
        queue.push({ id: child, rank: item.rank + 1 });
      }
    }
  }

  return ranks;
}
```

This may produce conflicts if a person is reachable through multiple paths.

Resolve rank conflicts by:

```txt
1. prefer shortest relationship distance from center
2. prefer explicit root direction
3. prefer rank closest to zero for spouse/partner
4. warn on irreconcilable cycle
```

---

## 8.3 If No Center Exists

Infer roots.

Roots are people who:

```txt
have no parent union
or have no visible parent union within current graph
```

Then layout from ancestor roots downward:

```txt
root people rank 0
their unions rank 1
their children rank 2
```

If there are multiple disconnected components, lay each component separately and place components side by side.

---

## 8.4 Neighborhood Mode

For large trees:

```ts
options.mode = "neighborhood"
```

Use ranked BFS around center.

Rules:

```txt
include ancestors up to maxAncestors
include descendants up to maxDescendants
include side branches up to maxSideBranches
always include unions needed to connect visible people
always include partners needed to make visible unions intelligible
```

Do not collect “rows of relatives” directly. Still collect a subgraph and run the same layout engine.

---

# 9. Ordering

File:

```txt
src/layout/family/order.ts
```

After ranks are assigned, group nodes by rank.

```ts
Map<number, FamilyNodeId[]>
```

Initial order:

```txt
explicit order
then birth year if available
then parent/union order
then id
```

Then perform barycenter ordering.

---

## 9.1 Barycenter Pass

For each layer, compute average x/order of connected nodes in adjacent layer.

Top-down pass:

```txt
rank -4 -> -3 -> -2 -> -1 -> 0 -> 1 -> 2
```

Bottom-up pass:

```txt
rank 4 -> 3 -> 2 -> 1 -> 0 -> -1 -> -2
```

Repeat 2-4 times.

Pseudo:

```ts
function orderByBarycenter(layer, neighborOrder) {
  return [...layer].sort((a, b) => {
    const ba = barycenter(a, neighborOrder);
    const bb = barycenter(b, neighborOrder);

    return (
      compareNullable(ba, bb) ||
      explicitOrder(a) - explicitOrder(b) ||
      stableId(a).localeCompare(stableId(b))
    );
  });
}
```

This reduces crossings without needing expensive exact crossing minimization.

---

## 9.2 Keep Union Families Together

Union should remain close to:

```txt
partners
children
```

Ordering weight:

```txt
partner-union edge weight high
union-child edge weight high
diagnostic/guardian edge weight lower
```

Do not allow generic sorting to separate a union from its own child block unless needed to avoid worse crossings.

---

# 10. Block Layout

File:

```txt
src/layout/family/blocks.ts
```

This is the most important part.

A good family tree is not just layer positions. It is block layout.

A union with children creates a block:

```txt
partner cluster
union node
child blocks
```

Conceptual shape:

```txt
Parent A     Parent B
     \       /
      Union
     /     \
 Child A   Child B
```

---

## 10.1 Person Block

```ts
type PersonBlock = {
  kind: "person-block";
  id: PersonId;
  width: number;
  height: number;
  centerX: number;
};
```

Default:

```txt
width = person card width
height = person card height
```

---

## 10.2 Union Block

```ts
type UnionBlock = {
  kind: "union-block";
  id: UnionId;

  partners: PersonId[];
  children: PersonId[];

  partnerWidth: number;
  childWidth: number;

  width: number;
  height: number;

  childBlocks: LayoutBlock[];
};
```

Width:

```ts
width = max(
  partnerClusterWidth,
  childSubtreeWidth,
  unionNodeWidth
)
```

Partner cluster width:

```ts
sum(partner card widths) + gaps
```

Child subtree width:

```ts
sum(child block widths) + sibling gaps
```

---

## 10.3 Basic Recursive Measurement

Pseudo:

```ts
function measurePersonSubtree(personId, visited) {
  const childUnions = getChildUnions(personId);

  if (childUnions.length === 0) {
    return personLeafBlock(personId);
  }

  const unionBlocks = childUnions.map(measureUnionBlock);

  const childrenWidth =
    sum(unionBlocks.map(b => b.width)) +
    gapBetweenUnionBlocks * (unionBlocks.length - 1);

  return {
    kind: "person-subtree",
    id: personId,
    width: max(personWidth, childrenWidth),
    unions: unionBlocks,
  };
}
```

Union:

```ts
function measureUnionBlock(unionId) {
  const union = graph.unions.get(unionId);

  const partnerWidth =
    sum(union.partners.map(widthOfPerson)) +
    partnerGap * (union.partners.length - 1);

  const childBlocks = union.children.map(measurePersonSubtree);

  const childWidth =
    sum(childBlocks.map(b => b.width)) +
    siblingGap * (childBlocks.length - 1);

  return {
    id: unionId,
    width: max(partnerWidth, childWidth, unionWidth),
    childBlocks,
  };
}
```

This works for simple trees.

For graphs where a person appears in multiple unions or appears more than once through cycles, use visited tracking and shared-node placement.

---

## 10.4 Shared Person Rule

A person should usually render once.

If a person appears in multiple unions:

```txt
render one primary person node
connect multiple union nodes to it
```

Primary position should be based on:

```txt
center/root proximity
then explicit union order
then number of descendants
then stable id
```

Secondary unions can be placed left/right around the primary person.

Subject with multiple unions:

```txt
        Alex
     ┌───┴────┐
  Union A   Union B
    │          │
  Riley      Casey
```

This looks better than:

```txt
Morgan  Alex  Jordan
  │      │      │
casey  ???   riley
```

For a root person with multiple unions, treat child unions as children of the person block.

---

## 10.5 Multiple Partners in One Union

For two partners:

```txt
A   B
 \ /
  U
```

For one partner:

```txt
A
|
U
```

For three or more partners:

```txt
A   B   C
 \  |  /
    U
```

The engine should support it, even if the UI rarely uses it.

---

## 10.6 Unknown Partner

Unknown partner can be:

```txt
synthetic visible person card
or hidden synthetic person
```

Option:

```ts
unknownPerson.enabled
```

If visible:

```txt
Alex   Unknown
  \    /
   Union
     |
   Child
```

If hidden:

```txt
Alex
 |
Union
 |
Child
```

The engine should still use a union node either way.

---

# 11. Coordinate Placement

File:

```txt
src/layout/family/compact.ts
```

## 11.1 Initial Placement

Within each measured block:

```txt
block center = 0
person centered over child unions
union centered over children
children distributed left-to-right
```

Example:

```ts
let cursor = -totalChildrenWidth / 2;

for childBlock of childBlocks:
  childBlock.x = cursor + childBlock.width / 2;
  cursor += childBlock.width + siblingGap;
```

---

## 11.2 Rank Y Coordinates

For top-down:

```ts
y = rank * spacing.rank
```

For left-right:

```ts
x = rank * spacing.rank
```

All algorithms should compute in top-down logical coordinates first, then transpose at the end if `direction === "left-right"`.

---

## 11.3 Non-Overlap Solver

For each rank, enforce minimum horizontal gaps.

Input:

```txt
ordered nodes with desired center x
```

Output:

```txt
actual center x values with no overlap
```

Use a pool-adjacent-violators-like pass or simple two-pass compaction.

Simple version:

```ts
function solveNonOverlapping(nodes, desiredCenters, gap) {
  const centers = [];

  for (let i = 0; i < nodes.length; i++) {
    const minCenter =
      i === 0
        ? desiredCenters[i]
        : centers[i - 1] + nodes[i - 1].width / 2 + gap + nodes[i].width / 2;

    centers[i] = Math.max(desiredCenters[i], minCenter);
  }

  const desiredAverage = average(desiredCenters);
  const actualAverage = average(centers);
  const shift = desiredAverage - actualAverage;

  return centers.map(x => x + shift);
}
```

Better version:

```txt
weighted isotonic regression / PAV
```

The current engine already has a useful non-overlap center solver idea. Reuse that concept, but apply it after union-node graph placement, not as the primary engine.

---

## 11.4 Component Layout

If graph has disconnected components:

```txt
layout each component independently
sort components by size/order/id
place components side by side with component gap
```

Warnings:

```txt
disconnected-component
```

Do not fail.

---

## 11.5 Centering

After all coordinates are final:

```ts
if center exists:
  dx = -centerNode.centerX
  apply dx to all nodes
```

Then add padding:

```ts
dx = padding - minX
dy = padding - minY
```

Final `bounds` should start at `0,0` or include `minX/minY` depending renderer preference.

Recommended for SVG canvas:

```txt
normalize to positive coordinates
also expose original logical center if needed
```

---

# 12. Edge Routing

File:

```txt
src/layout/family/route.ts
```

Because unions are real nodes, edge routing becomes simple.

Primary routes:

```txt
person -> union
union -> child
```

---

## 12.1 Top-Down Orthogonal Edge

From person bottom center to union top/center:

```txt
M personBottom
L vertical midpoint
L unionCenter
```

From union bottom center to child top center:

```txt
M unionBottom
L vertical midpoint
L childTop
```

For clean multi-child union:

```txt
Parent A     Parent B
    \         /
      Union
        |
   horizontal bus
    |       |
 Child A Child B
```

But because the union node is real, you can route:

```txt
partner -> union
union -> child
```

instead of building fake parent bars.

---

## 12.2 Partner Line Rendering

Render partner-union edges as:

```txt
person center/bottom -> union center/top
```

For visible spouse bar style, renderer can draw extra horizontal ornament between partner cards, but layout should not depend on that.

Important:

```txt
The spouse bar is visual decoration.
The union node is the actual relationship geometry.
```

---

## 12.3 Status Styling

Edge metadata:

```txt
current
former
divorced
separated
unknown
```

Renderer can style:

```txt
solid
dashed
slash mark
double slash mark
faded
```

But engine only returns metadata.

---

## 12.4 Parent Link Styling

If parent link kind exists:

```txt
biological
adoptive
step
foster
guardian
unknown
```

Use this on `union-child` or optional overlay `parent-child` edges.

Default simple rendering:

```txt
union-child edge gets mixed relation if all parent links same
otherwise relation = "mixed"
```

Advanced rendering later:

```txt
separate thin lines from each parent through union to child
```

But v1 should keep one union-child bus.

---

# 13. Main Layout Pipeline

File:

```txt
src/layout/family/layout.ts
```

Main function:

```ts
export function layoutFamilyTree<Person>(
  input: FamilyLayoutInput<Person>,
): FamilyLayoutResult<Person> {
  const normalized = normalizeFamilyInput(input);

  const graph = buildFamilyGraph(normalized);

  const visibleGraph = selectVisibleGraph(graph, normalized.options);

  const ranks = assignFamilyRanks(visibleGraph, {
    root: normalized.root,
    center: normalized.center,
    mode: normalized.options.mode,
  });

  const layers = buildRankLayers(visibleGraph, ranks);

  const orderedLayers = orderFamilyLayers(visibleGraph, layers);

  const blocks = measureFamilyBlocks(visibleGraph, orderedLayers, normalized.options);

  const placed = placeFamilyBlocks(visibleGraph, blocks, normalized.options);

  const compacted = compactFamilyLayout(placed, normalized.options);

  const centered = centerFamilyLayout(compacted, normalized.center, normalized.options);

  const edges = routeFamilyEdges(centered, visibleGraph, normalized.options);

  const bounds = computeFamilyBounds(centered.nodes, edges, normalized.options);

  return {
    nodes: centered.nodes,
    people: centered.nodes.filter(isPersonNode),
    unions: centered.nodes.filter(isUnionNode),
    edges,
    bounds,
    warnings: [
      ...normalized.warnings,
      ...graph.warnings,
      ...visibleGraph.warnings,
      ...centered.warnings,
    ],
  };
}
```

Every stage should be testable independently.

---

# 14. React Renderer

React should be thin.

```tsx
export function FamilyTree<Person>({
  people,
  unions,
  parentLinks,
  root,
  center,
  options,
  card: Card = DefaultFamilyCard,
}: FamilyTreeProps<Person>) {
  const layout = useMemo(
    () =>
      layoutFamilyTree({
        people,
        unions,
        parentLinks,
        root,
        center,
        options,
      }),
    [people, unions, parentLinks, root, center, options],
  );

  return (
    <FamilyTreeCanvas bounds={layout.bounds}>
      <FamilyTreeEdges edges={layout.edges} />
      <FamilyTreeNodeLayer nodes={layout.people} card={Card} />
    </FamilyTreeCanvas>
  );
}
```

React renderer responsibilities:

```txt
render SVG edges
render person cards
render optional union dots/debug markers
handle pan/zoom
handle selected/focused states
handle click events
```

React renderer must not:

```txt
compute ranks
sort families
guess parent bars
repair data
route edges manually
```

---

# 15. Current-to-New Migration

## 15.1 Delete/Demote Old Concepts

Remove as core architecture:

```txt
rel helper DSL as primary API
old FamilyGraph as primary API
graphToFamilyRelationships as central conversion
subject-neighborhood row collector as primary layout
createFamilyRelativeRows
createSubjectRow
orderSubjectPartners
createChildRowItems
post-hoc edge guessing from cards
```

You can keep tiny helper functions later, but not as engine foundations.

---

## 15.2 Replace with New Concepts

New foundations:

```txt
FamilyUnion
FamilyParentLink
normalizeFamilyInput
InternalFamilyGraph
assignFamilyRanks
orderFamilyLayers
measureFamilyBlocks
placeFamilyBlocks
compactFamilyLayout
routeFamilyEdges
layoutFamilyTree
```

---

## 15.3 Old Graph Adapter

Since legacy compatibility does not matter, this is optional.

But useful for internal migration:

```ts
function oldGraphToNewInput(graph) {
  return {
    people: graph.people,
    center: graph.subject,
    unions: graph.partnershipGroups.map(group => ({
      id: group.id,
      partners: group.partners,
      children: childrenForGroup(group.id, graph.parentChildLinks),
      kind: group.relation,
      status: group.status,
      order: group.order,
    })),
    parentLinks: graph.parentChildLinks.map(link => ({
      parent: link.parentId,
      child: link.childId,
      union: link.groupId,
      kind: link.relation,
      order: link.order,
    })),
  };
}
```

Do not expose this publicly unless useful.

---

# 16. Implementation Order

Build in this order.

## Phase 1: Types and Pure Core Skeleton

Files:

```txt
types.ts
warnings.ts
layout.ts
index.ts
```

Implement empty but typed function:

```ts
layoutFamilyTree(input) => {
  nodes: [],
  people: [],
  unions: [],
  edges: [],
  bounds: zeroBounds,
  warnings: [],
}
```

---

## Phase 2: Normalization

Implement:

```txt
people map
union map
parentLinks
synthetic unions
synthetic people
dedupe
warnings
```

Tests:

```txt
missing person creates synthetic person
parent links without union create synthetic union
union children create parent links
duplicate children removed
```

---

## Phase 3: Graph Indexes

Implement:

```txt
buildFamilyGraph
unionsByPartner
unionsByChild
partnersByUnion
childrenByUnion
edges
component detection
```

Tests:

```txt
two-parent child graph shape
one-person multiple-union graph shape
single-parent graph shape
```

---

## Phase 4: Ranking

Implement:

```txt
assignFamilyRanks
center person rank = 0
parent union rank = -1
parents rank = -2
child union rank = +1
children rank = +2
```

Tests:

```txt
parent ranks above child
child ranks below parent
partner stays same person generation
union is between generations
```

---

## Phase 5: Simple Placement

Implement direct layer placement:

```txt
bucket by rank
sort by order/id
assign x left-to-right
assign y by rank
center selected node
```

This will not be perfect, but creates visible output.

---

## Phase 6: Union Block Placement

Implement:

```txt
measure child blocks
union centered over children
partners centered around union
person with multiple child unions distributes them below
```

This is where visual quality starts working.

---

## Phase 7: Compaction

Implement:

```txt
non-overlap per rank
component spacing
bounds
padding
```

---

## Phase 8: Edge Routing

Implement:

```txt
partner-union paths
union-child paths
orthogonal paths
status/relation metadata
```

---

## Phase 9: React Renderer

Implement:

```txt
FamilyTree
FamilyTreeCanvas
FamilyTreeEdges
FamilyTreeNodeLayer
DefaultFamilyCard
```

Keep it dumb.

---

## Phase 10: Visual Tuning

Tune:

```txt
rank gap
sibling gap
union gap
partner gap
card defaults
edge style
union hidden marker
```

---

# 17. Tests

Do not judge this only by screenshots. Use geometry assertions.

## 17.1 Basic Tests

```txt
simple parent child
two parents one child
two parents three children
single parent one child
unknown parent
one person two unions
two people divorced with child
adoptive parent
guardian
disconnected components
cycle degradation
```

---

## 17.2 Geometry Assertions

Helpers:

```ts
expectNoOverlaps(result.people);
expectRank("parent").toBeLessThan(rank("child"));
expectUnionBetween("u1", "parent", "child");
expectCenteredOn(result, "alex");
expectChildrenBelowUnion("u1");
expectPartnersAroundUnion("u1");
```

---

## 17.3 Example Test

```ts
test("two parents one child", () => {
  const result = layoutFamilyTree({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
    },
    unions: [
      {
        id: "u1",
        partners: ["alex", "jordan"],
        children: ["riley"],
      },
    ],
    center: "riley",
  });

  const alex = person(result, "alex");
  const jordan = person(result, "jordan");
  const riley = person(result, "riley");
  const u1 = union(result, "u1");

  expect(u1.y).toBeGreaterThan(Math.max(alex.y, jordan.y));
  expect(riley.y).toBeGreaterThan(u1.y);
  expect(u1.x).toBeCloseTo((centerX(alex) + centerX(jordan)) / 2);
  expect(centerX(riley)).toBeCloseTo(centerX(u1));
  expectNoOverlaps(result.people);
});
```

---

# 18. Visual Defaults

Good default geometry:

```ts
personSize: {
  width: 220,
  height: 80,
}

unionSize: {
  width: 18,
  height: 18,
}

spacing: {
  rank: 96,
  person: 28,
  sibling: 32,
  union: 44,
  partner: 20,
  component: 140,
  padding: 48,
}
```

SVG styles:

```css
.memoir-tree-edge {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.memoir-tree-edge[data-status="former"],
.memoir-tree-edge[data-status="divorced"],
.memoir-tree-edge[data-status="separated"] {
  stroke-dasharray: 6 5;
}

.memoir-tree-union {
  opacity: 0;
  pointer-events: none;
}
```

Union markers can be hidden by default but available for debug mode.

---

# 19. Debug Mode

Add:

```ts
options.debug?: boolean;
```

Debug should show:

```txt
union nodes
rank labels
node ids
edge kinds
bounds boxes
component boxes
warnings overlay
```

This will make layout development much easier.

---

# 20. Why This Works

Family trees are not pure trees. They are relationship graphs.

The clean abstraction is:

```txt
person
union
child
```

A union is the parent of a child branch, not just a spouse bar.

Once unions are real nodes:

```txt
multiple partners becomes multiple union nodes
single parent becomes one-partner union
unknown parent becomes synthetic partner or hidden union
adoption/step/guardian becomes edge metadata
children attach to the correct union
edge routing becomes simple
layout becomes block-based instead of row-hacked
```

The engine should not try to make arbitrary graphs beautiful using force layout.

Use:

```txt
ranked family graph
union nodes
block measurement
barycenter ordering
non-overlap compaction
orthogonal edge routing
```

That gives deterministic, readable, flat family trees.

---

# 21. Final Target Architecture

```txt
@memoir/tree
  public:
    FamilyTree
    layoutFamilyTree
    types

  internal:
    layout/family = pure engine
    react/family = renderer
    styles = CSS

  input:
    people + unions + optional parentLinks

  internal:
    person nodes + union nodes + partner-union edges + union-child edges

  output:
    positioned people
    positioned unions
    routed edges
    bounds
    warnings
```

The package should optimize for this sentence:

```txt
Give me people and unions; I will return stable coordinates and edges that actually look like a family tree.
```

---

# 22. Immediate Next Code Target

Build only this first:

```txt
src/layout/family/types.ts
src/layout/family/normalize.ts
src/layout/family/graph.ts
src/layout/family/rank.ts
src/layout/family/layout.ts
```

Then one simple test:

```txt
Alex + Jordan union has Riley.
Alex + Morgan union has Casey.
Center Alex.
Expected:
  Alex centered.
  two unions below Alex.
  Riley under first union.
  Casey under second union.
  no overlap.
```

If that test looks right, the engine foundation is correct.
