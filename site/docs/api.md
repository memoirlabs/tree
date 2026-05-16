# Public API

All public exports come from `@memoir/tree`.

## Family Tree

- `FamilyTree`
- `rel`
- `createFamilyIndex(people, relationships)`
- `collectFamilyNeighborhood(index, subject)`
- `buildFamilyTreeLayout(input)`

## Family Types

- `PersonId`
- `PeopleById<Person>`
- `FamilyRelationship`
- `FamilyParentageRelationship`
- `FamilyPartnershipRelationship`
- `FamilyGuardianshipRelationship`
- `ComputedRelation`
- `FamilyCardProps<Person>`
- `FamilyTreeProps<Person>`
- `FamilyTreeLayoutResult<Person>`

## Relationship Helpers

- `rel.parents(child, parents, options?)`
- `rel.children(parents, children, options?)`
- `rel.partner(a, b, options?)`
- `rel.guardians(child, guardians, options?)`

## Generic Relationship Graph

- `RelationshipChart`
- `buildRelationshipChartLevels(nodes, relationships, rootId, mode?)`
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

## Row Adapter API

- `RelationshipTableRow`
- `buildRelationshipGraphFromRows(rows)`
- `buildRelationshipChartInputFromRows(rows)`
- `inferRelationshipChartMode(relationships)`
- `inferRelationshipRootId(nodes, relationships, preferredDomain?)`
- `getRelationshipDisplaySemantics(edge)`

Use row adapters when your source of truth is a database table of generic relationship rows. Use family relationship facts for the ergonomic `FamilyTree` API.
