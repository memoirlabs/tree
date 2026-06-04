import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, rel } from "../src/index";

const people = {
  childA: { id: "childA", name: "Child A" },
  childB: { id: "childB", name: "Child B" },
  parentA: { id: "parentA", name: "Parent A" },
  parentB: { id: "parentB", name: "Parent B" },
};

function firstMoveY(path: string) {
  const [, , y] = path.split(" ");
  return Number(y);
}

function firstLineY(path: string) {
  const [, , , , y] = path.split(" ");
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
