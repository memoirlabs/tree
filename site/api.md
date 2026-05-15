# Public API

All public exports come from `@memoir/tree`.

The source barrel is `src/index.ts`. The built package entry is `dist/index.js`.

## Row Adapter API

- `RelationshipTableRow`
- `buildRelationshipGraphFromRows(rows)`
- `buildFamilyMemberFromRelationshipRows(rows, rootId?)`
- `buildRelationshipChartInputFromRows(rows)`
- `inferRelationshipChartMode(relationships)`
- `inferRelationshipRootId(nodes, relationships, preferredDomain?)`
- `getRelationshipDisplaySemantics(edge)`

These functions are framework-independent. Use them when your source of truth is
a database table of relationship rows.

## Components

- `FamilyTree`
- `FamilyNodeCard`
- `AddMemberDialog`
- `RelationshipChart`

## Schema

- `parseFamilyTreeYaml(source)`
- `validateFamilyTreeSchema(input)`
- `resolveFamilyTreeSchema(schema, runtime)`
- `FamilyTreeSchemaError`

## Layout

- `buildFamilyTreeLayout(rootMember, options)`

## Relationship Graph

- `createRelationshipIndex(nodes, relationships)`
- `getUpstream(index, nodeId, options?)`
- `getDownstream(index, nodeId, options?)`
- `getSpouses(index, nodeId)`
- `getFormerSpouses(index, nodeId)`
- `getSiblings(index, nodeId)`
- `getManagers(index, nodeId)`
- `getReports(index, nodeId)`
- `getPeers(index, nodeId)`
- `getCeoChain(index, nodeId)`
- `familyMemberToRelationshipNodes(rootMember)`
- `buildRelationshipChartLevels(nodes, relationships, rootId, mode?)`

## Presets

- `familyTreePresets`
- `getFamilyTreeConfig(preset, overrides?)`

## Important Types

- `FamilyMember`
- `RelationType`
- `FamilyMemberStatus`
- `AddMemberPayload`
- `ProfileSearchResult`
- `FamilyTreeCardConfig`
- `FamilyTreeConnectorConfig`
- `FamilyTreeConnectorOverrides`
- `FamilyTreeSchema`
- `RelationshipNode`
- `RelationshipEdge`
- `RelationshipIndex`
- `RelationshipLevel`
- `RelationshipChartMode`

## Type Import Example

```ts
import type {
  FamilyMember,
  RelationshipEdge,
  RelationshipNode,
  RelationType,
} from "@memoir/tree";
```
