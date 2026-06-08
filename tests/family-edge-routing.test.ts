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

function pathSegments(path: string) {
  const tokens = path.split(/\s+/);
  const segments: Array<{ x1: number; x2: number; y1: number; y2: number }> = [];
  let current: { x: number; y: number } | null = null;

  for (let index = 0; index < tokens.length; index += 1) {
    const command = tokens[index];
    if (command !== "M" && command !== "L") continue;
    const x = Number(tokens[index + 1]);
    const y = Number(tokens[index + 2]);
    index += 2;
    if (command === "L" && current) {
      segments.push({ x1: current.x, y1: current.y, x2: x, y2: y });
    }
    current = { x, y };
  }

  return segments;
}

function segmentCrossesCardInterior(
  segment: { x1: number; x2: number; y1: number; y2: number },
  card: Pick<FamilyTreeLayoutCard<unknown>, "height" | "width" | "x" | "y">,
) {
  const left = card.x + 1;
  const right = card.x + card.width - 1;
  const top = card.y + 1;
  const bottom = card.y + card.height - 1;

  if (segment.y1 === segment.y2) {
    const minX = Math.min(segment.x1, segment.x2);
    const maxX = Math.max(segment.x1, segment.x2);
    return segment.y1 > top && segment.y1 < bottom && maxX > left && minX < right;
  }

  if (segment.x1 === segment.x2) {
    const minY = Math.min(segment.y1, segment.y2);
    const maxY = Math.max(segment.y1, segment.y2);
    return segment.x1 > left && segment.x1 < right && maxY > top && minY < bottom;
  }

  return false;
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
  expect(edge?.path).toContain("M 50 80 L 50 120");
  expect(edge?.path).toContain("M 290 80 L 290 120");
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

  expect(layout.edges.some((edge) => edge.sourceId === "parentA" && edge.targetId === "parentB")).toBe(true);
  expect(layout.edges.filter((edge) => edge.targetId === "childA")).toHaveLength(1);
});
