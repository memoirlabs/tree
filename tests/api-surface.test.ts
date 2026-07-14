import { expect, test } from "bun:test";

import * as tree from "../src/index";
import * as familyPrimitives from "../src/tree/family/FamilyTreePrimitives";
import * as treePrimitivesCompat from "../src/tree/family/TreePrimitives";
import type {
  FamilyGraph,
  FamilyTreeProps,
  OrgChartGraph,
  OrgChartProps,
  OrgRelationshipHelpers,
  RelationshipHelpers,
  TreeApi,
} from "../src/index";

const expectedRuntimeExports = [
  "TreeSurface",
  "getTreeStyleName",
  "treeStylePresets",
  "buildLayeredTreeLayout",
  "DefaultFamilyCard",
  "FamilyTree",
  "StyledFamilyCard",
  "DefaultOrgCard",
  "OrgChart",
  "TreeCanvas",
  "TreeEdges",
  "TreeNodeLayer",
  "TreeProvider",
  "useTreeLayout",
  "getFamilyChildBearingGroupIds",
  "getFamilyChildPlacementGroupIds",
  "getFamilyPartnershipGroupIds",
  "graphToFamilyRelationships",
  "formatFamilyRelationLabel",
  "getDefaultFamilyRelationLabel",
  "rel",
  "graphToOrgReportingRelationships",
  "org",
  "collectFamilyNeighborhood",
  "createFamilyIndex",
  "defaultFamilyNeighborhoodLimits",
  "collectOrgChartSubtree",
  "createOrgChartIndex",
  "buildFamilyTreeLayout",
  "createFamilyLayoutService",
  "createUnionParentLinks",
  "defaultFamilyLayoutOptions",
  "layoutFamilyTree",
  "resolveFamilyLayoutOptions",
  "buildOrgChartLayout",
] as const;

test("keeps the public root runtime export surface available", () => {
  for (const exportName of expectedRuntimeExports) {
    expect(tree[exportName]).toBeDefined();
  }
});

test("keeps org helper aliases on the root export", () => {
  expect(tree.org.manager("ceo", ["eng"])).toEqual(tree.org.reports("ceo", ["eng"]));
  expect(tree.org.report("ceo", "eng")).toEqual(tree.org.reports("ceo", "eng"));
});

test("keeps the old family primitive module path as a compatibility shim", () => {
  expect(treePrimitivesCompat.TreeProvider).toBe(familyPrimitives.TreeProvider);
  expect(treePrimitivesCompat.TreeCanvas).toBe(familyPrimitives.TreeCanvas);
  expect(treePrimitivesCompat.TreeEdges).toBe(familyPrimitives.TreeEdges);
  expect(treePrimitivesCompat.TreeNodeLayer).toBe(familyPrimitives.TreeNodeLayer);
  expect(treePrimitivesCompat.useTreeLayout).toBe(familyPrimitives.useTreeLayout);
});

const _typeSmoke: {
  familyGraph?: FamilyGraph;
  familyProps?: FamilyTreeProps<unknown>;
  orgGraph?: OrgChartGraph;
  orgProps?: OrgChartProps<unknown>;
  orgHelpers: OrgRelationshipHelpers;
  relHelpers: RelationshipHelpers;
  api?: TreeApi;
} = {
  orgHelpers: tree.org,
  relHelpers: tree.rel,
};

void _typeSmoke;
