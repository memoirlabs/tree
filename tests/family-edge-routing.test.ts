import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, rel } from "../src/index";
import { routeFamilyEdges } from "../src/tree/family/family-edge-routing";
import type { FamilyTreeLayoutCard } from "../src/tree/family/layout-types";

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

  const parentBottom = Math.max(
    ...layout.cards
      .filter((card) => card.personId === "parentA" || card.personId === "parentB")
      .map((card) => card.y + card.height),
  );
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
  expect(firstLineY(childGroupEdge?.path ?? "")).toBeGreaterThanOrEqual(parentBottom);
  expect(firstLineY(childGroupEdge?.path ?? "")).toBeGreaterThan((parentCenterY + childTop) / 2);
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

  expect(edge?.path).toBe("M 110 40 L 110 110 L 290 110 L 290 140");
  expect(firstLineY(edge?.path ?? "")).toBeGreaterThan(80);
});

test("draws explicit partnership bars before parentage fallback bars", () => {
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
