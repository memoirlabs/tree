import { expect, test } from "bun:test";

import {
  buildFamilyMemberFromRelationshipRows,
  buildRelationshipChartInputFromRows,
  buildRelationshipGraphFromRows,
  getRelationshipDisplaySemantics,
  inferRelationshipChartMode,
} from "../src/adapters";
import type { RelationshipTableRow } from "../src/adapters";

const familyRows: RelationshipTableRow[] = [
  { sourceId: "morgan", sourceLabel: "Morgan", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "casey", sourceLabel: "Casey", targetId: "alex", targetLabel: "Alex", type: "parent" },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "jordan", targetLabel: "Jordan", type: "spouse" },
  { sourceId: "riley", sourceLabel: "Riley", targetId: "alex", targetLabel: "Alex", type: "child", sourceOrder: 1 },
  { sourceId: "alex", sourceLabel: "Alex", targetId: "quinn", targetLabel: "Quinn", type: "parent", targetOrder: 2 },
];

test("normalizes flat family rows into graph edges", () => {
  const graph = buildRelationshipGraphFromRows(familyRows);

  expect(graph.inferredDomain).toBe("family");
  expect(inferRelationshipChartMode(graph.relationships)).toBe("family");
  expect(graph.relationships.map((relationship) => `${relationship.sourceId}->${relationship.targetId}:${relationship.type}`)).toContain(
    "alex->riley:parent",
  );
});

test("builds a nested FamilyMember from relationship rows", () => {
  const member = buildFamilyMemberFromRelationshipRows(familyRows, "alex");

  expect(member?.parents?.map((parent) => parent.id)).toEqual(["casey", "morgan"]);
  expect(member?.spouse?.id).toBe("jordan");
  expect(member?.children?.map((child) => child.id)).toEqual(["riley", "quinn"]);
});

test("infers org chart input from database-like rows", () => {
  const input = buildRelationshipChartInputFromRows([
    { sourceId: "ceo", sourceLabel: "CEO", targetId: "vp", targetLabel: "VP", type: "ceo" },
    { sourceId: "vp", sourceLabel: "VP", targetId: "lead", targetLabel: "Lead", type: "manager" },
    { sourceId: "assistant", sourceLabel: "Assistant", targetId: "vp", targetLabel: "VP", type: "assistant" },
  ]);

  expect(input.mode).toBe("org");
  expect(input.rootId).toBe("ceo");
  expect(input.relationships.map((relationship) => relationship.type)).toEqual(["ceo", "manager", "assistant"]);
});

test("describes family and org line etiquette", () => {
  expect(getRelationshipDisplaySemantics({ type: "former_spouse" })).toMatchObject({
    domain: "family",
    pattern: "dashed",
    placement: "horizontal",
  });
  expect(getRelationshipDisplaySemantics({ type: "assistant" })).toMatchObject({
    domain: "org",
    pattern: "solid",
    placement: "side",
  });
  expect(getRelationshipDisplaySemantics({ type: "peer" })).toMatchObject({
    domain: "org",
    pattern: "dashed",
    placement: "same-row",
  });
});
