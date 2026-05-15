# YAML Schema

`schemaYaml` lets consumers describe UI behavior declaratively while keeping
runtime callbacks in TypeScript.

## Example

```yaml
version: 1
tree:
  title: Family Tree
  showTitle: true
layout:
  strategy: auto
  density: compact
connectors:
  preset: contrast
  anchors:
    verticalGapPx: 28
card:
  fields: [name, relation, status]
  className: node-box
editing:
  enabled: true
  rootRelations: [parent, sibling, spouse, former_spouse, child]
  memberRelations: [child, spouse, former_spouse]
```

## Runtime Usage

```tsx
<FamilyTree
  rootMember={rootMember}
  schemaYaml={schemaYaml}
  onAddMember={handleAddMember}
  searchProfiles={searchProfiles}
/>
```

Runtime props win over schema values. Functions and JSX are never encoded in
YAML.

## Supported Top-Level Keys

- `version`: Must be `1`.
- `tree`: Title and title visibility.
- `layout`: Strategy and density.
- `connectors`: Preset and connector overrides.
- `card`: Default card field/display configuration.
- `editing`: Add-menu relation configuration.

## Validation

Use the parser directly when you want to validate a schema before rendering:

```ts
import { parseFamilyTreeYaml, validateFamilyTreeSchema } from "@memoir/tree";

const schema = parseFamilyTreeYaml(source);
validateFamilyTreeSchema(schema);
```

Invalid keys and invalid enum values throw `FamilyTreeSchemaError` with a path
like `editing.rootRelations[1] must be one of: ...`.
