# Relationship Graph

The relationship graph helpers work without React. Use them when your data is
already an edge list or when you need relationship queries before rendering.

## Core Types

```ts
type RelationshipNode = {
  id: string;
  label: string;
  data?: unknown;
};

type RelationshipEdge = {
  sourceId: string;
  targetId: string;
  type: RelationType;
  label?: string;
  status?: "active" | "former" | "pending";
};
```

## Database Rows

Most apps store relationships as table rows rather than nested objects. Use
`RelationshipTableRow` when your database has records like
`source_id`, `target_id`, and `type`.

```ts
import { buildRelationshipGraphFromRows } from "@memoir/tree";
import type { RelationshipTableRow } from "@memoir/tree";

const rows: RelationshipTableRow[] = [
  { sourceId: "parent-1", sourceLabel: "Morgan", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "child-1", targetLabel: "Riley", type: "parent" },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "jordan", targetLabel: "Jordan", type: "spouse" },
];

const graph = buildRelationshipGraphFromRows(rows);
```

The adapter:

- creates stable `RelationshipNode` records from both sides of every row
- normalizes reverse rows such as `child` and `direct_report`
- infers `family`, `org`, or `mixed`
- picks a deterministic root when one is not supplied
- preserves `sourceData`, `targetData`, and `edgeData` for host metadata

Use `sourceOrder` and `targetOrder` for family birth order or org display order.

## Indexing

```ts
import { createRelationshipIndex } from "@memoir/tree";

const index = createRelationshipIndex(nodes, relationships);
```

The index builds `nodesById`, `outgoingById`, and `incomingById` maps for fast
queries.

## Traversal

```ts
import { getDownstream, getUpstream } from "@memoir/tree";

const managers = getUpstream(index, "employee-id", { maxDepth: 2 });
const reports = getDownstream(index, "manager-id", { maxDepth: 3 });
```

Both return depth-grouped levels:

```ts
type RelationshipLevel = {
  depth: number;
  nodes: RelationshipNode[];
};
```

## Relationship Helpers

- `getSiblings(index, nodeId)`
- `getSpouses(index, nodeId)`
- `getFormerSpouses(index, nodeId)`
- `getManagers(index, nodeId)`
- `getReports(index, nodeId)`
- `getPeers(index, nodeId)`
- `getCeoChain(index, nodeId)`

## Supported Relations

Family relations:

- `parent`
- `child`
- `sibling`
- `spouse`
- `former_spouse`
- `grandparent`
- `grandchild`

Org relations:

- `manager`
- `direct_report`
- `peer`
- `ceo`
- `assistant`

## Display Semantics

`getRelationshipDisplaySemantics(edge)` returns the line etiquette for each
relationship type:

- family parent/child: vertical solid generation connectors
- family spouse: same-row horizontal solid connector
- family former spouse: same-row horizontal dashed connector
- org manager/CEO: vertical solid reporting connector
- org assistant: side connector below the assisted role and above reports
- org peer: same-row dashed connector only when the meaning is explicit
