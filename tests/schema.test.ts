import { expect, test } from "bun:test";

import { FamilyTreeSchemaError, parseFamilyTreeYaml, resolveFamilyTreeSchema } from "../src/schema";

test("parses and resolves a YAML family tree schema", () => {
  const schema = parseFamilyTreeYaml(`
version: 1
tree:
  title: Family Tree
layout:
  strategy: auto
  density: compact
connectors:
  preset: contrast
  anchors:
    verticalGapPx: 24
card:
  fields:
    - name
    - status
editing:
  enabled: true
  rootRelations: [parent, sibling, spouse, child]
  memberRelations: [child]
`);

  const resolved = resolveFamilyTreeSchema(schema);

  expect(resolved.title).toBe("Family Tree");
  expect(resolved.canEdit).toBe(true);
  expect(resolved.designPreset).toBe("contrast");
  expect(resolved.connectorConfig.anchors.verticalGapPx).toBe(24);
  expect(resolved.layout).toEqual({ strategy: "auto", density: "compact" });
  expect(resolved.cardConfig.fields).toEqual(["name", "status"]);
  expect(resolved.rootRelations).toEqual(["parent", "sibling", "spouse", "child"]);
});

test("runtime props override schema defaults", () => {
  const schema = parseFamilyTreeYaml(`
version: 1
tree:
  title: Schema Title
  showTitle: false
editing:
  enabled: true
connectors:
  preset: compact
`);

  const resolved = resolveFamilyTreeSchema(schema, {
    title: "Runtime Title",
    showTitle: true,
    canEdit: false,
    designPreset: "default",
  });

  expect(resolved.title).toBe("Runtime Title");
  expect(resolved.showTitle).toBe(true);
  expect(resolved.canEdit).toBe(false);
  expect(resolved.designPreset).toBe("default");
});

test("rejects unsupported schema fields", () => {
  expect(() =>
    parseFamilyTreeYaml(`
version: 1
layout:
  unknown: compact
`),
  ).toThrow(FamilyTreeSchemaError);
});

test("rejects invalid relation values", () => {
  expect(() =>
    parseFamilyTreeYaml(`
version: 1
editing:
  rootRelations: [parent, cousin]
`),
  ).toThrow("editing.rootRelations[1] must be one of");
});
