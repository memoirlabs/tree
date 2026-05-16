# Ergonomic React Family Tree Library Design

## Goal

Build a React family tree library where the app gives the library:

```txt
people
relationships
subject person
one normal card component
```

and the library automatically handles:

```txt
relationship normalization
kinship labels
automatic layout
DOM measurement
edge routing
generation placement
stable ordering
normal CSS styling hooks
```

The public API should feel simple:

```tsx
<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  card={PersonCard}
/>
```

The library should **not** force users to understand:

```txt
hidden union nodes
manual x/y positions
fixed node sizes
SVG edge math
layout internals
relationship graph anchors
special styling systems
YAML syntax
render props for every node type
```

The design rule:

```txt
The app owns person data and visual design.
The library owns relationships, layout, measurement, and connections.
```

---

## What should be shown on the website landing section

The top code sample should be elegant and minimal:

```tsx
import { FamilyTree, rel } from "@memoir/family-tree"
import { PersonCard } from "./PersonCard"

const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma"),
  rel.children(["henry", "emma"], ["ava"]),
]

export default function App() {
  return (
    <FamilyTree
      subject="henry"
      people={people}
      relationships={relationships}
      card={PersonCard}
    />
  )
}
```

This communicates:

```txt
Describe relationships.
Bring your own card.
Get an automatic family tree.
```

No fake `name: "Henry"` requirement. The library should not care what fields exist inside a person object.

---

## Person data is app-owned

The library should not require a specific display shape.

Good:

```ts
const people = {
  henry: {
    id: "henry",
    handle: "@henry",
    profile: {
      display: "Henry",
      avatar: "/people/henry.jpg",
    },
  },

  carol: {
    id: "carol",
    profile: {
      display: "Carol",
    },
  },

  james: {
    id: "james",
    profile: {
      display: "James",
    },
  },

  emma: {
    id: "emma",
    profile: {
      display: "Emma",
    },
  },

  ava: {
    id: "ava",
    profile: {
      display: "Ava",
    },
  },
}
```

The card decides how to render that data:

```tsx
function PersonCard({ person, relation, ...props }) {
  return (
    <article {...props}>
      {person.profile.avatar && <img src={person.profile.avatar} alt="" />}
      <strong>{person.profile.display}</strong>
      <small>{relation.label}</small>
    </article>
  )
}
```

The tree library only needs stable person IDs.

---

## Main public API

The core user-facing API should be:

```tsx
<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  card={PersonCard}
/>
```

Optional props can exist, but the default should already be useful:

```tsx
<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  card={PersonCard}
  className="family-tree"
  cardClassName="person-card"
  edgeClassName="family-edge"
  onPersonClick={(person) => openPersonDrawer(person.id)}
/>
```

The component should default to:

```txt
automatic layout
automatic card measurement
automatic edge routing
automatic relation labels
automatic generation placement
```

The user should not have to pass layout mode, node size, or edge renderers for the basic case.

---

## Real app API

For a production app like Memoir, the app likely already has people/profile data and a relationship table.

The real app usage should be:

```tsx
<FamilyTree
  subject={currentUser.personId}
  people={peopleById}
  relationships={relationshipsFromDb}
  card={PersonCard}
/>
```

The app owns:

```txt
fetching
auth
database writes
modals
person profile display
privacy filtering
permissions
```

The tree owns:

```txt
relationship indexing
visible family window
relation labels
layout
measurement
edge paths
rendering cards in the right places
```

---

## Relationship helpers

For examples, tests, demos, and small apps, expose a small `rel` helper.

```ts
const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma"),
  rel.children(["henry", "emma"], ["ava"]),
]
```

These helpers should compile to simple relationship rows.

### `rel.parents(child, parents, options?)`

```ts
rel.parents("henry", ["carol", "james"])
```

Compiles to:

```ts
{
  type: "parentage",
  parents: ["carol", "james"],
  children: ["henry"],
  relation: "biological",
}
```

With options:

```ts
rel.parents("henry", ["carol", "james"], {
  relation: "adoptive",
  status: "current",
})
```

### `rel.children(parents, children, options?)`

```ts
rel.children(["henry", "emma"], ["ava"])
```

Compiles to:

```ts
{
  type: "parentage",
  parents: ["henry", "emma"],
  children: ["ava"],
  relation: "biological",
}
```

### `rel.partner(a, b, options?)`

```ts
rel.partner("henry", "emma")
```

Compiles to:

```ts
{
  type: "partnership",
  partners: ["henry", "emma"],
  relation: "partner",
  status: "current",
}
```

With options:

```ts
rel.partner("henry", "emma", {
  relation: "spouse",
  status: "current",
})
```

### `rel.guardians(child, guardians, options?)`

```ts
rel.guardians("ava", ["carol"])
```

Compiles to:

```ts
{
  type: "guardianship",
  guardians: ["carol"],
  children: ["ava"],
  relation: "guardian",
}
```

---

## Relationship row shape

The internal row shape can stay simple.

```ts
type FamilyRelationship = {
  id?: string

  type:
    | "parentage"
    | "partnership"
    | "guardianship"

  parents?: string[]
  children?: string[]
  partners?: string[]
  guardians?: string[]

  relation?:
    | "biological"
    | "adoptive"
    | "step"
    | "foster"
    | "guardian"
    | "spouse"
    | "partner"
    | "coparent"
    | "unknown"

  status?:
    | "current"
    | "former"
    | "divorced"
    | "separated"
    | "unknown"

  order?: number
}
```

This supports:

```txt
biological parents
adoptive parents
step relationships
guardians
partners
spouses
former partners
coparents
half-siblings
multiple partners
children from different relationships
```

Do not store computed labels like `half-sibling` as primary truth.

Instead, compute them from facts.

Example:

```ts
const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.parents("sarah", ["anna", "james"]),
]
```

From Henry’s perspective:

```txt
sarah = half-sibling
```

The app does not need to store that label.

---

## Card component contract

The user gives the library one card component.

```tsx
function PersonCard({ person, relation, selected, collapsed, ...props }) {
  return (
    <article {...props}>
      <strong>{person.profile.display}</strong>
      <small>{relation.label}</small>
    </article>
  )
}
```

The library renders one card instance for every visible person.

The card receives:

```ts
type FamilyCardProps<Person> = {
  person: Person

  relation: {
    label:
      | "self"
      | "parent"
      | "grandparent"
      | "great-grandparent"
      | "child"
      | "grandchild"
      | "great-grandchild"
      | "sibling"
      | "half-sibling"
      | "partner"
      | "coparent"
      | "guardian"
      | "unknown"

    generation: number

    side:
      | "self"
      | "ancestor"
      | "descendant"
      | "sibling"
      | "partner"
      | "other"
  }

  selected: boolean
  focused: boolean
  collapsed: boolean

  className?: string
  style?: React.CSSProperties
}
```

The card should also receive normal HTML props, including:

```txt
className
style
onClick
data attributes
aria attributes
```

---

## Styling contract

Styling should be normal CSS.

The library should automatically add stable data attributes:

```html
<article
  data-family-card
  data-person-id="henry"
  data-relation="self"
  data-generation="0"
  data-side="self"
>
  ...
</article>
```

Edges should also get data attributes:

```html
<path
  data-family-edge
  data-edge-kind="biological"
/>
```

Basic CSS:

```css
[data-family-card] {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: white;
}

[data-family-card][data-relation="self"] {
  border-color: black;
}

[data-family-card][data-side="ancestor"] {
  background: #f8fafc;
}

[data-family-card][data-side="descendant"] {
  background: white;
}

[data-family-edge] {
  stroke: #aaa;
  stroke-width: 2;
  fill: none;
}

[data-family-edge][data-edge-kind="adoptive"] {
  stroke-dasharray: 4 4;
}
```

Optional class props:

```tsx
<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  card={PersonCard}
  className="family-tree"
  cardClassName="person-card"
  edgeClassName="family-edge"
/>
```

CSS:

```css
.family-tree {
  width: 100%;
  height: 720px;
  overflow: auto;
}

.person-card {
  min-width: 220px;
  padding: 12px 16px;
  border-radius: 16px;
  background: white;
}

.family-edge {
  stroke: #aaa;
  stroke-width: 2;
  fill: none;
}
```

The library should not require:

```txt
Tailwind
theme objects
CSS-in-JS
fixed card width
manual node sizes
special style providers
```

---

## DOM structure

The library should separate layout from card styling.

Internal DOM should look like:

```html
<div data-family-card-positioner style="position:absolute; transform:translate(...)">
  <div data-family-measure>
    <article data-family-card class="person-card">
      ...
    </article>
  </div>
</div>
```

Reason:

```txt
The outer wrapper owns layout positioning.
The user card owns visual styling.
```

This prevents transform conflicts.

Bad design:

```html
<article style="position:absolute; transform:translate(...)">
```

Because user CSS like this would break layout:

```css
.person-card:hover {
  transform: scale(1.04);
}
```

Correct design:

```txt
wrapper transform = layout
card transform = user animation
```

---

## Automatic measurement

The user should not pass fixed node sizes.

The card should be styled normally:

```css
.person-card {
  min-width: 220px;
  padding: 12px 16px;
}
```

The library should measure the rendered card using `ResizeObserver`.

Flow:

```txt
initial render uses a fallback size
card mounts
ResizeObserver measures actual width/height
layout recalculates
edges redraw
```

Internal measurement state:

```ts
type Measurements = Record<string, {
  width: number
  height: number
}>
```

Fallback size:

```ts
const FALLBACK_CARD_SIZE = {
  width: 220,
  height: 80,
}
```

The fallback is only for the first pass. It is not part of the public API.

---

# Minimal automatic layout engine

The first layout engine should not try to solve every possible family graph perfectly.

It should solve the common, useful, readable case:

```txt
subject-centered family neighborhood
```

Default visible people:

```txt
grandparents
parents
siblings
half-siblings
subject
partners
children
grandchildren
```

The output should look like:

```txt
generation -2: grandparents

generation -1: parents

generation  0: siblings / subject / partners

generation +1: children

generation +2: grandchildren
```

This is the automatic default.

---

## Layout input

```ts
type LayoutInput<Person> = {
  subject: string
  people: Record<string, Person>
  relationships: FamilyRelationship[]
  measurements: Record<string, Size>
}
```

## Layout output

```ts
type LayoutResult<Person> = {
  cards: LayoutCard<Person>[]
  edges: LayoutEdge[]
  bounds: Rect
}
```

```ts
type LayoutCard<Person> = {
  personId: string
  person: Person
  x: number
  y: number
  width: number
  height: number
  relation: ComputedRelation
}
```

```ts
type LayoutEdge = {
  id: string
  path: string
  kind:
    | "biological"
    | "adoptive"
    | "step"
    | "foster"
    | "guardian"
    | "partner"
    | "unknown"
}
```

---

## Step 1: index the relationships

Build lookup maps.

```ts
type FamilyIndex = {
  people: Record<string, Person>
  parentageByChild: Map<string, FamilyRelationship[]>
  parentageByParent: Map<string, FamilyRelationship[]>
  partnershipsByPerson: Map<string, FamilyRelationship[]>
}
```

Logic:

```ts
function createFamilyIndex(people, relationships) {
  const parentageByChild = new Map()
  const parentageByParent = new Map()
  const partnershipsByPerson = new Map()

  for (const relationship of relationships) {
    if (relationship.type === "parentage") {
      for (const child of relationship.children ?? []) {
        push(parentageByChild, child, relationship)
      }

      for (const parent of relationship.parents ?? []) {
        push(parentageByParent, parent, relationship)
      }
    }

    if (relationship.type === "partnership") {
      for (const partner of relationship.partners ?? []) {
        push(partnershipsByPerson, partner, relationship)
      }
    }
  }

  return {
    people,
    parentageByChild,
    parentageByParent,
    partnershipsByPerson,
  }
}
```

---

## Step 2: collect the subject’s neighborhood

Given a subject, compute:

```ts
type AutoRelatives = {
  self: string
  parents: string[]
  grandparents: string[]
  siblings: string[]
  halfSiblings: string[]
  partners: string[]
  children: string[]
  grandchildren: string[]
  relationships: FamilyRelationship[]
}
```

Minimal logic:

```txt
parents:
  parentage rows where subject is a child

children:
  parentage rows where subject is a parent

partners:
  partnership rows where subject is a partner
  plus coparents from parentage rows involving subject's children

siblings:
  people who share all known parents with subject

half-siblings:
  people who share at least one parent but not all known parents

grandparents:
  parents of subject's parents

grandchildren:
  children of subject's children
```

This gives a useful automatic first view.

---

## Step 3: compute relation labels

Relative to `subject`, compute:

```ts
type ComputedRelation = {
  label:
    | "self"
    | "parent"
    | "grandparent"
    | "child"
    | "grandchild"
    | "sibling"
    | "half-sibling"
    | "partner"
    | "coparent"
    | "guardian"
    | "unknown"

  generation: number

  side:
    | "self"
    | "ancestor"
    | "descendant"
    | "sibling"
    | "partner"
    | "other"
}
```

Examples:

```txt
subject       -> label self, generation 0, side self
parent        -> label parent, generation -1, side ancestor
grandparent   -> label grandparent, generation -2, side ancestor
child         -> label child, generation +1, side descendant
grandchild    -> label grandchild, generation +2, side descendant
sibling       -> label sibling, generation 0, side sibling
half-sibling  -> label half-sibling, generation 0, side sibling
partner       -> label partner, generation 0, side partner
```

---

## Step 4: assign rows

For the first version, use five fixed rows:

```ts
const rows = {
  "-2": grandparents,
  "-1": parents,
  "0": [...siblings, subject, ...partners],
  "1": children,
  "2": grandchildren,
}
```

Half-siblings can sit in generation `0` near siblings.

Order within row:

```txt
manual order if available
birth date if available
created order if available
stable ID order as fallback
```

Stable ordering matters. Nodes should not randomly jump between renders.

---

## Step 5: place rows

Use measured card sizes.

Default spacing:

```ts
const DEFAULT_SPACING = {
  row: 120,
  column: 32,
}
```

For each row:

```txt
1. Get each card's measured width.
2. Compute total row width.
3. Place cards left-to-right.
4. Center row around x = 0.
```

Pseudo-code:

```ts
function placeRow(personIds, y, measurements) {
  const sizes = personIds.map(id => measurements[id] ?? FALLBACK_CARD_SIZE)

  const totalWidth =
    sum(sizes.map(size => size.width)) +
    (personIds.length - 1) * DEFAULT_SPACING.column

  let x = -totalWidth / 2

  return personIds.map((personId, index) => {
    const size = sizes[index]

    const card = {
      personId,
      x,
      y,
      width: size.width,
      height: size.height,
    }

    x += size.width + DEFAULT_SPACING.column

    return card
  })
}
```

For Y positions:

```ts
rowY[-2] = 0
rowY[-1] = maxHeight(row -2) + rowGap
rowY[0]  = rowY[-1] + maxHeight(row -1) + rowGap
rowY[1]  = rowY[0]  + maxHeight(row 0)  + rowGap
rowY[2]  = rowY[1]  + maxHeight(row 1)  + rowGap
```

Then shift all cards so the subject is visually centered.

---

## Step 6: improve centering around family groups

Basic row placement is enough for v0.

The first improvement should be:

```txt
parents should center above their child group
children should center below their parent/partner group
```

Minimal group centering:

```txt
If parent row exists:
  center parents above subject + siblings.

If child row exists:
  center children under subject + partner group.
```

Do not start with a full graph layout solver.

Start with predictable, readable placement.

---

## Step 7: route edges

Use simple orthogonal SVG paths.

For parentage:

```txt
parent card bottom center
  ↓
shared midpoint
  ↓
child card top center
```

For partnership:

```txt
left partner side center
  →
right partner side center
```

For vertical parent-child edge:

```ts
function verticalEdge(from, to) {
  const x1 = from.x + from.width / 2
  const y1 = from.y + from.height

  const x2 = to.x + to.width / 2
  const y2 = to.y

  const midY = (y1 + y2) / 2

  return `
    M ${x1} ${y1}
    L ${x1} ${midY}
    L ${x2} ${midY}
    L ${x2} ${y2}
  `
}
```

For partner edge:

```ts
function horizontalEdge(a, b) {
  const aRight = a.x + a.width
  const aY = a.y + a.height / 2

  const bLeft = b.x
  const bY = b.y + b.height / 2

  return `
    M ${aRight} ${aY}
    L ${bLeft} ${bY}
  `
}
```

This is enough for a clean v0.

---

## Step 8: collapse distant branches by default

If there are too many relatives, do not render everyone.

Default caps:

```ts
const AUTO_LIMITS = {
  grandparents: 4,
  parents: 4,
  siblings: 8,
  partners: 3,
  children: 8,
  grandchildren: 8,
}
```

If a row exceeds the cap:

```txt
show most relevant people
show a collapsed summary node later
```

For v0, simply cap and warn in development.

---

## Minimal internal file structure

Keep the first implementation small.

```txt
src/
  FamilyTree.tsx
  rel.ts
  types.ts
  createFamilyIndex.ts
  getAutoRelatives.ts
  createAutoLayout.ts
  useCardMeasurements.ts
  routeEdges.ts
  index.ts
```

Do not split into 40 files at the start.

---

## Minimal implementation sequence

Build in this order:

### 1. Relationship helpers

Implement:

```ts
rel.parents(child, parents, options?)
rel.children(parents, children, options?)
rel.partner(a, b, options?)
rel.guardians(child, guardians, options?)
```

### 2. Basic card rendering

Make this work first:

```tsx
<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  card={PersonCard}
/>
```

Render cards in a vertical list temporarily.

### 3. Measurement

Add card measurement with `ResizeObserver`.

### 4. Relationship indexing

Build maps:

```txt
parentageByChild
parentageByParent
partnershipsByPerson
```

### 5. Auto relatives

Compute:

```txt
parents
grandparents
siblings
half-siblings
partners
children
grandchildren
```

### 6. Row layout

Place five rows:

```txt
grandparents
parents
siblings / subject / partners
children
grandchildren
```

### 7. Edge routing

Draw parent-child and partner lines.

### 8. Styling attributes

Add:

```txt
data-family-card
data-relation
data-generation
data-side
data-family-edge
data-edge-kind
```

### 9. Click handling

Expose:

```tsx
onPersonClick={(person) => openProfile(person.id)}
```

That is the v0.

---

## What not to build first

Do not build these first:

```txt
YAML syntax
drag and drop
manual positioning
user-defined edge renderers
custom union nodes
huge theme system
GEDCOM import
PDF export
AI relationship inference
100,000 person graph support
full arbitrary graph layout
```

Those can come after the core experience works.

---

## Final product promise

The library should promise:

```txt
Give it people, relationships, and one card component.
It renders a clean, automatic, measurable, CSS-friendly family tree.
```

The simplest final API:

```tsx
const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma"),
  rel.children(["henry", "emma"], ["ava"]),
]

<FamilyTree
  subject="henry"
  people={people}
  relationships={relationships}
  card={PersonCard}
/>
```

The important part:

```txt
Relationships are semantic.
Cards are normal React.
Styling is normal CSS.
Layout is automatic.
