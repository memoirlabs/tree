import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, rel } from "../src/index";
import { routeFamilyEdges } from "../src/tree/family/family-edge-routing";
import type { FamilyTreeLayoutCard } from "../src/tree/family/layout-types";
import { pathSegments, segmentCrossesCardInterior } from "./helpers/geometry";

const people = {
  childA: { id: "childA", name: "Child A" },
  childB: { id: "childB", name: "Child B" },
  parentA: { id: "parentA", name: "Parent A" },
  parentB: { id: "parentB", name: "Parent B" },
  parentC: { id: "parentC", name: "Parent C" },
};

function firstMoveY(path: string) {
  const [, , y] = path.split(" ");
  return Number(y);
}

function firstLineY(path: string) {
  const [, , , , , y] = path.split(" ");
  return Number(y);
}

function cardById(layout: ReturnType<typeof buildFamilyTreeLayout>, personId: string) {
  const card = layout.cards.find((candidate) => candidate.personId === personId);
  expect(card).toBeDefined();
  return card!;
}

function edgeKind(layout: ReturnType<typeof buildFamilyTreeLayout>, idPrefix: string) {
  return layout.edges.find((edge) => edge.id.startsWith(idPrefix))?.kind;
}

test("routes two-parent child groups below the parent cards", () => {
  const layout = buildFamilyTreeLayout({
    subject: "parentA",
    people,
    relationships: [
      rel.partner("parentA", "parentB"),
      rel.children(["parentA", "parentB"], ["childA", "childB"]),
    ],
    measurements: {
      childA: { width: 88, height: 64 },
      childB: { width: 88, height: 64 },
      parentA: { width: 88, height: 64 },
      parentB: { width: 88, height: 64 },
    },
    spacing: {
      column: 20,
      padding: 32,
      row: 40,
    },
  });

  const parentCenterY = Math.max(
    ...layout.cards
      .filter((card) => card.personId === "parentA" || card.personId === "parentB")
      .map((card) => card.y + card.height / 2),
  );
  const childTop = Math.min(
    ...layout.cards
      .filter((card) => card.personId === "childA" || card.personId === "childB")
      .map((card) => card.y),
  );
  const childGroupEdge = layout.edges.find((edge) => edge.kind === "biological" && edge.path.includes(" M "));

  expect(childGroupEdge).toBeDefined();
  expect(firstMoveY(childGroupEdge?.path ?? "")).toBe(parentCenterY);
  expect(firstLineY(childGroupEdge?.path ?? "")).toBe(parentCenterY);
  const parentA = cardById(layout, "parentA");
  const parentB = cardById(layout, "parentB");
  const midpointX = (parentA.x + parentA.width + parentB.x) / 2;
  expect(childGroupEdge?.path).toContain(
    `M ${parentA.x + parentA.width} ${parentCenterY} L ${parentB.x} ${parentCenterY}`,
  );
  expect(childGroupEdge?.path).toContain(`M ${midpointX} ${parentCenterY} L ${midpointX}`);
  expect(Math.max(...(childGroupEdge?.path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []))).toBeGreaterThan(childTop);
  expect(childGroupEdge?.sourcePort).toBe("center");
  expect(childGroupEdge?.targetPort).toBe("top");
});

test("does not draw a relationship bar for two-parent parentage without an explicit partnership", () => {
  const layout = buildFamilyTreeLayout({
    subject: "parentA",
    people,
    relationships: [rel.children(["parentA", "parentB"], ["childA"])],
    measurements: {
      childA: { width: 88, height: 64 },
      parentA: { width: 88, height: 64 },
      parentB: { width: 88, height: 64 },
    },
    spacing: {
      column: 20,
      padding: 32,
      row: 40,
    },
  });

  const parentageEdges = layout.edges.filter((edge) => edge.kind === "biological");
  const parentA = cardById(layout, "parentA");
  const parentB = cardById(layout, "parentB");
  const parentCenterY = parentA.y + parentA.height / 2;

  expect(parentageEdges.some((edge) => edge.id.endsWith("-bar"))).toBe(false);
  expect(parentageEdges).toHaveLength(1);
  expect(firstMoveY(parentageEdges[0]?.path ?? "")).toBe(parentCenterY);
  expect(parentageEdges[0]?.path).toContain(`M ${parentA.x + parentA.width} ${parentCenterY} L ${parentB.x} ${parentCenterY}`);
});

test("routes right-shifted single children below the parent cards", () => {
  const cards: FamilyTreeLayoutCard<{ name: string }>[] = [
    {
      personId: "parentA",
      person: { name: "Parent A" },
      relation: { label: "parent", generation: -1, side: "ancestor" },
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "parentB",
      person: { name: "Parent B" },
      relation: { label: "parent", generation: -1, side: "ancestor" },
      x: 120,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "childA",
      person: { name: "Child A" },
      relation: { label: "child", generation: 1, side: "descendant" },
      x: 240,
      y: 140,
      width: 100,
      height: 60,
    },
  ];

  const edge = routeFamilyEdges(cards, [rel.children(["parentA", "parentB"], ["childA"])]).find(
    (layoutEdge) => layoutEdge.targetId === "childA",
  );

  expect(edge?.path).toBe("M 100 40 L 120 40 M 110 40 L 110 140");
  expect(firstLineY(edge?.path ?? "")).toBe(40);
});

test("does not draw an orphan stem for hidden sibling connector parents", () => {
  const cards: FamilyTreeLayoutCard<{ name: string }>[] = [
    {
      personId: "connector",
      person: { name: "Connector" },
      relation: { label: "parent", generation: -1, side: "ancestor" },
      x: 170,
      y: 0,
      width: 0,
      height: 0,
      hiddenCard: true,
    },
    {
      personId: "childA",
      person: { name: "Child A" },
      relation: { label: "sibling", generation: 0, side: "sibling" },
      x: 0,
      y: 80,
      width: 100,
      height: 60,
    },
    {
      personId: "childB",
      person: { name: "Child B" },
      relation: { label: "self", generation: 0, side: "self" },
      x: 240,
      y: 80,
      width: 100,
      height: 60,
    },
  ];

  const edge = routeFamilyEdges(cards, [rel.children(["connector"], ["childA", "childB"])]).find(
    (layoutEdge) => layoutEdge.targetId === "childA",
  );

  expect(edge?.path.startsWith("M 170 0")).toBe(false);
  expect(edge?.path).toBe("M 50 40 L 290 40 M 50 40 L 50 80 M 290 40 L 290 80");
});

test("routes connector-only co-parent edges from the parent connector point", () => {
  const cards: FamilyTreeLayoutCard<{ name: string }>[] = [
    {
      personId: "parentA",
      person: { name: "Parent A" },
      relation: { label: "parent", generation: -1, side: "ancestor" },
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "parentB",
      person: { name: "Parent B" },
      relation: { label: "coparent", generation: 0, side: "partner" },
      x: 160,
      y: 0,
      width: 0,
      height: 0,
      hiddenCard: true,
    },
    {
      personId: "childA",
      person: { name: "Child A" },
      relation: { label: "child", generation: 1, side: "descendant" },
      x: 200,
      y: 140,
      width: 100,
      height: 80,
    },
  ];

  const edges = routeFamilyEdges(cards, [rel.children(["parentA", "parentB"], ["childA"])]);
  const edge = edges.find((layoutEdge) => layoutEdge.targetId === "childA");

  expect(edge?.path).toBe("M 130 20 L 130 110 L 250 110 L 250 140");
});

test("draws explicit partnership bars before inferred parentage bars", () => {
  const childrenFirst = buildFamilyTreeLayout({
    subject: "childA",
    people,
    relationships: [
      rel.children(["parentA", "parentB"], ["childA"]),
      rel.partner("parentA", "parentB", { relation: "spouse" }),
    ],
    measurements: {
      childA: { width: 88, height: 64 },
      parentA: { width: 88, height: 64 },
      parentB: { width: 88, height: 64 },
    },
    spacing: {
      column: 20,
      padding: 32,
      row: 40,
    },
  });
  const partnerFirst = buildFamilyTreeLayout({
    subject: "childA",
    people,
    relationships: [
      rel.partner("parentA", "parentB", { relation: "spouse" }),
      rel.children(["parentA", "parentB"], ["childA"]),
    ],
    measurements: {
      childA: { width: 88, height: 64 },
      parentA: { width: 88, height: 64 },
      parentB: { width: 88, height: 64 },
    },
    spacing: {
      column: 20,
      padding: 32,
      row: 40,
    },
  });

  expect(edgeKind(childrenFirst, "partnership")).toBe("spouse");
  expect(edgeKind(partnerFirst, "partnership")).toBe("spouse");
  expect(childrenFirst.edges.filter((edge) => edge.sourceId === "parentA" && edge.targetId === "parentB")).toHaveLength(1);
});

test("draws adjacent visible partner bars for multi-partner groups", () => {
  const cards: FamilyTreeLayoutCard<{ name: string }>[] = [
    {
      personId: "parentB",
      person: { name: "Parent B" },
      relation: { label: "partner", generation: 0, side: "partner" },
      x: 140,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "parentC",
      person: { name: "Parent C" },
      relation: { label: "partner", generation: 0, side: "partner" },
      x: 280,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "parentA",
      person: { name: "Parent A" },
      relation: { label: "partner", generation: 0, side: "partner" },
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    },
  ];

  const partnerEdges = routeFamilyEdges(cards, [
    {
      id: "multi-partner",
      type: "partnership",
      partners: ["parentB", "parentC", "parentA"],
      relation: "partner",
    },
  ]).filter((edge) => edge.kind === "partner");

  expect(partnerEdges).toHaveLength(2);
  expect(partnerEdges.map((edge) => `${edge.sourceId}->${edge.targetId}`)).toEqual([
    "parentA->parentB",
    "parentB->parentC",
  ]);
  expect(partnerEdges.map((edge) => edge.path)).toEqual(["M 100 40 L 140 40", "M 240 40 L 280 40"]);
});

test("routes non-adjacent parentage around intervening cards", () => {
  const cards: FamilyTreeLayoutCard<{ name: string }>[] = [
    {
      personId: "parentA",
      person: { name: "Parent A" },
      relation: { label: "parent", generation: -1, side: "ancestor" },
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "other",
      person: { name: "Other" },
      relation: { label: "partner", generation: 0, side: "partner" },
      x: 120,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "parentB",
      person: { name: "Parent B" },
      relation: { label: "parent", generation: -1, side: "ancestor" },
      x: 240,
      y: 0,
      width: 100,
      height: 80,
    },
    {
      personId: "childA",
      person: { name: "Child A" },
      relation: { label: "child", generation: 1, side: "descendant" },
      x: 120,
      y: 160,
      width: 100,
      height: 60,
    },
  ];

  const edge = routeFamilyEdges(cards, [rel.children(["parentA", "parentB"], ["childA"])]).find(
    (layoutEdge) => layoutEdge.targetId === "childA",
  );
  expect(edge).toBeDefined();
  expect(edge?.path).toContain("M 100 40 L 100 120");
  expect(edge?.path).toContain("M 240 40 L 240 120");
  expect(edge?.path).not.toContain("M 100 40 L 240 40");
  expect(pathSegments(edge?.path ?? "").some((segment) => segmentCrossesCardInterior(segment, cards[1]!))).toBe(false);
});

test("does not draw a fake partnership bar for unknown partner placeholders", () => {
  const layout = buildFamilyTreeLayout({
    subject: "parentA",
    people,
    relationships: [
      rel.partner("parentA", "parentB", { relation: "unknown", status: "unknown" }),
      rel.children(["parentA"], ["childA"]),
    ],
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["parentA", "parentB", "childA"]);
  expect(layout.edges.some((edge) => edge.sourceId === "parentA" && edge.targetId === "parentB")).toBe(false);
  expect(layout.edges.filter((edge) => edge.sourceId === "parentA" && edge.targetId === "childA")).toHaveLength(1);
});

test("connects an unknown placeholder when it is actually a parent", () => {
  const layout = buildFamilyTreeLayout({
    subject: "parentA",
    people,
    relationships: [
      rel.partner("parentA", "parentB", { relation: "unknown", status: "unknown" }),
      rel.children(["parentA", "parentB"], ["childA"]),
    ],
  });

  expect(layout.edges.some((edge) => edge.sourceId === "parentA" && edge.targetId === "parentB")).toBe(false);
  expect(layout.edges.filter((edge) => edge.targetId === "childA")).toHaveLength(1);
  expect(layout.edges.find((edge) => edge.targetId === "childA")?.path).toContain(" M ");
});
