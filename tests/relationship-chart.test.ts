import { expect, test } from "bun:test";

import { buildRelationshipChartLevels } from "../src/RelationshipChart";
import type { RelationshipEdge, RelationshipNode } from "../src/relationships";

const nodes: RelationshipNode[] = [
  { id: "ceo", label: "CEO" },
  { id: "vp", label: "VP" },
  { id: "lead", label: "Lead" },
  { id: "report", label: "Report" },
  { id: "peer", label: "Peer" },
  { id: "spouse", label: "Spouse" },
];

const relationships: RelationshipEdge[] = [
  { sourceId: "ceo", targetId: "vp", type: "ceo" },
  { sourceId: "vp", targetId: "lead", type: "manager" },
  { sourceId: "lead", targetId: "report", type: "manager" },
  { sourceId: "lead", targetId: "peer", type: "peer" },
  { sourceId: "lead", targetId: "spouse", type: "spouse" },
];

test("builds org chart levels", () => {
  const levels = buildRelationshipChartLevels(nodes, relationships, "lead", "org");

  expect(levels.map((level) => level.id)).toEqual(["managers", "current", "reports"]);
  expect(levels[0]?.nodes.map((node) => node.id)).toEqual(["vp"]);
  expect(levels[1]?.nodes.map((node) => node.id)).toEqual(["lead", "peer"]);
  expect(levels[2]?.nodes.map((node) => node.id)).toEqual(["report"]);
});

test("builds all chart levels with upstream and downstream", () => {
  const levels = buildRelationshipChartLevels(nodes, relationships, "lead", "all");

  expect(levels.map((level) => level.depth)).toEqual([-2, -1, 0, 1]);
  expect(levels[0]?.nodes.map((node) => node.id)).toEqual(["ceo"]);
  expect(levels[2]?.nodes.map((node) => node.id)).toEqual(["spouse", "lead", "peer"]);
});

test("auto mode chooses org levels for management edges", () => {
  const levels = buildRelationshipChartLevels(nodes, relationships.filter((relationship) => relationship.type !== "spouse"), "lead", "auto");

  expect(levels.map((level) => level.id)).toEqual(["managers", "current", "reports"]);
});
