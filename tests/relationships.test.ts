import { expect, test } from "bun:test";

import {
  createRelationshipIndex,
  getCeoChain,
  getDownstream,
  getFormerSpouses,
  getManagers,
  getPeers,
  getReports,
  getSiblings,
  getSpouses,
  getUpstream,
} from "../src/relationships";
import type { RelationshipEdge, RelationshipNode } from "../src/relationships";

const nodes: RelationshipNode[] = [
  { id: "alex", label: "Alex" },
  { id: "sam", label: "Sam" },
  { id: "taylor", label: "Taylor" },
  { id: "jordan", label: "Jordan" },
  { id: "riley", label: "Riley" },
  { id: "ceo", label: "CEO" },
  { id: "vp", label: "VP" },
  { id: "lead", label: "Lead" },
  { id: "report", label: "Report" },
];

const relationships: RelationshipEdge[] = [
  { sourceId: "alex", targetId: "sam", type: "parent" },
  { sourceId: "alex", targetId: "taylor", type: "parent" },
  { sourceId: "alex", targetId: "jordan", type: "spouse" },
  { sourceId: "alex", targetId: "riley", type: "former_spouse" },
  { sourceId: "ceo", targetId: "vp", type: "ceo" },
  { sourceId: "vp", targetId: "lead", type: "manager" },
  { sourceId: "lead", targetId: "report", type: "manager" },
];

test("finds family relations", () => {
  const index = createRelationshipIndex(nodes, relationships);

  expect(getDownstream(index, "alex", { maxDepth: 1 }).flatMap((level) => level.nodes.map((node) => node.id))).toEqual([
    "sam",
    "taylor",
  ]);
  expect(getUpstream(index, "sam", { maxDepth: 1 }).flatMap((level) => level.nodes.map((node) => node.id))).toEqual([
    "alex",
  ]);
  expect(getSiblings(index, "sam").map((node) => node.id)).toEqual(["taylor"]);
  expect(getSpouses(index, "alex").map((node) => node.id)).toEqual(["jordan"]);
  expect(getFormerSpouses(index, "alex").map((node) => node.id)).toEqual(["riley"]);
});

test("finds org chart relations", () => {
  const index = createRelationshipIndex(nodes, relationships);

  expect(getManagers(index, "report").map((node) => node.id)).toEqual(["lead"]);
  expect(getReports(index, "vp").map((node) => node.id)).toEqual(["lead"]);
  expect(getPeers(index, "lead").map((node) => node.id)).toEqual([]);
  expect(getCeoChain(index, "report").map((node) => node.id)).toEqual(["lead", "vp", "ceo"]);
  expect(getDownstream(index, "ceo").map((level) => level.nodes.map((node) => node.id))).toEqual([
    ["vp"],
    ["lead"],
    ["report"],
  ]);
});
