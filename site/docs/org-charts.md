# Org Charts

`RelationshipChart` renders unstyled levels from generic nodes and edges.

## Modes

- `org`: Managers, current row, and direct reports.
- `upstream`: Ancestors/managers above the root.
- `downstream`: Reports/descendants below the root.
- `family`: Parents, partners, current row, and children.
- `all`: Upstream, partners/peers/root, and downstream.

## Example

```tsx
import { RelationshipChart } from "@memoir/tree";

const nodes = [
  { id: "ceo", label: "CEO" },
  { id: "vp", label: "VP Engineering" },
  { id: "lead", label: "Engineering Lead" },
  { id: "frontend", label: "Frontend Engineer" },
  { id: "backend", label: "Backend Engineer" },
];

const relationships = [
  { sourceId: "ceo", targetId: "vp", type: "ceo" },
  { sourceId: "vp", targetId: "lead", type: "manager" },
  { sourceId: "lead", targetId: "frontend", type: "manager" },
  { sourceId: "lead", targetId: "backend", type: "manager" },
];

export function OrgChart() {
  return (
    <RelationshipChart
      nodes={nodes}
      relationships={relationships}
      rootId="lead"
      mode="all"
    />
  );
}
```

## Flat Relationship Rows

Org charts usually map directly to a database relationship table. You can pass
those rows without manually creating `nodes` and `relationships`:

```tsx
import { RelationshipChart } from "@memoir/tree";
import type { RelationshipTableRow } from "@memoir/tree";

const rows: RelationshipTableRow[] = [
  { sourceId: "ceo", sourceLabel: "CEO", targetId: "vp-eng", targetLabel: "VP Engineering", type: "ceo" },
  { sourceId: "vp-eng", sourceLabel: "VP Engineering", targetId: "lead", targetLabel: "Engineering Lead", type: "manager" },
  { sourceId: "assistant", sourceLabel: "Executive Assistant", targetId: "ceo", targetLabel: "CEO", type: "assistant" },
];

export function OrgChart() {
  return <RelationshipChart rows={rows} mode="auto" />;
}
```

`mode="auto"` chooses `org` for management-only data, `family` for
genealogy-only data, and `all` for mixed data.

## Org Chart Etiquette

The adapter exposes the conventions through `getRelationshipDisplaySemantics`:

- `manager` and `ceo` are solid vertical reporting lines
- `direct_report` is accepted and normalized into a `manager` edge
- `assistant` is a side attachment below the assisted role and above direct reports
- `peer` is same-row and dashed because dotted-line relationships must have explicit meaning
- all boxes should stay consistently sized in host styling

## Custom Nodes

```tsx
<RelationshipChart
  nodes={nodes}
  relationships={relationships}
  rootId="lead"
  mode="org"
  renderNode={(node, options) => (
    <div className={options.isRoot ? "root" : "node"}>
      <strong>{node.label}</strong>
      <small>depth {options.depth}</small>
    </div>
  )}
/>
```

The component emits data attributes for testing and styling:

- `data-relationship-chart`
- `data-relationship-mode`
- `data-relationship-level`
- `data-relationship-depth`
- `data-relationship-node-id`
