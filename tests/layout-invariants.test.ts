import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, buildOrgChartLayout, org } from "../src/index";
import type { FamilyGraph, TreeLayoutEdge } from "../src/index";
import { pathSegments, segmentCrossesCardInterior } from "./helpers/geometry";

type Person = { name: string };

const familyGraph: FamilyGraph<Person> = {
  people: {
    grandA: { name: "Grand A" },
    grandB: { name: "Grand B" },
    parentA: { name: "Parent A" },
    parentB: { name: "Parent B" },
    siblingA: { name: "Sibling A" },
    subject: { name: "Subject" },
    partnerLeft: { name: "Partner L" },
    partnerRight: { name: "Partner R" },
    partnerFar: { name: "Partner Far" },
    childA: { name: "Child A" },
    childB: { name: "Child B" },
    childC: { name: "Child C" },
    grandChildA: { name: "Grandchild A" },
    nieceA: { name: "Niece A" },
  },
  subject: "subject",
  partnershipGroups: [
    { id: "parents", partners: ["parentA", "parentB"], relation: "spouse", order: 1 },
    { id: "subject-partners", partners: ["partnerLeft", "subject", "partnerRight", "partnerFar"], order: 2 },
  ],
  parentChildLinks: [
    { id: "grandA-parentA", parentId: "grandA", childId: "parentA", order: 1 },
    { id: "grandB-parentA", parentId: "grandB", childId: "parentA", order: 1 },
    { id: "parentA-subject", groupId: "parents", parentId: "parentA", childId: "subject", order: 2 },
    { id: "parentB-subject", groupId: "parents", parentId: "parentB", childId: "subject", order: 2 },
    { id: "parentA-siblingA", groupId: "parents", parentId: "parentA", childId: "siblingA", order: 3 },
    { id: "parentB-siblingA", groupId: "parents", parentId: "parentB", childId: "siblingA", order: 3 },
    { id: "subject-childA", groupId: "subject-partners", parentId: "subject", childId: "childA", order: 4 },
    { id: "partnerRight-childA", groupId: "subject-partners", parentId: "partnerRight", childId: "childA", order: 4 },
    { id: "subject-childB", groupId: "subject-partners", parentId: "subject", childId: "childB", order: 5 },
    { id: "partnerFar-childB", groupId: "subject-partners", parentId: "partnerFar", childId: "childB", order: 5 },
    { id: "subject-childC", parentId: "subject", childId: "childC", order: 6 },
    { id: "childA-grandChildA", parentId: "childA", childId: "grandChildA", order: 7 },
    { id: "siblingA-nieceA", parentId: "siblingA", childId: "nieceA", order: 8 },
  ],
};

function edgeNumbers(edge: TreeLayoutEdge) {
  return edge.path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
}

function rectanglesOverlap(
  a: { height: number; width: number; x: number; y: number },
  b: { height: number; width: number; x: number; y: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expectLayoutInvariants(layout: {
  bounds: { height: number; width: number };
  cards: Array<{ height: number; personId: string; width: number; x: number; y: number }>;
  edges: TreeLayoutEdge[];
}) {
  for (const card of layout.cards) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(layout.bounds.width);
    expect(card.y + card.height).toBeLessThanOrEqual(layout.bounds.height);
  }

  for (let aIndex = 0; aIndex < layout.cards.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < layout.cards.length; bIndex += 1) {
      expect(rectanglesOverlap(layout.cards[aIndex]!, layout.cards[bIndex]!)).toBe(false);
    }
  }

  for (const edge of layout.edges) {
    const numbers = edgeNumbers(edge);
    for (let index = 0; index < numbers.length; index += 2) {
      expect(numbers[index]).toBeGreaterThanOrEqual(0);
      expect(numbers[index]).toBeLessThanOrEqual(layout.bounds.width);
      expect(numbers[index + 1]).toBeGreaterThanOrEqual(0);
      expect(numbers[index + 1]).toBeLessThanOrEqual(layout.bounds.height);
    }

    for (const segment of pathSegments(edge.path)) {
      for (const card of layout.cards) {
        expect(segmentCrossesCardInterior(segment, card)).toBe(false);
      }
    }
  }
}

test("family stress layout satisfies core geometric invariants", () => {
  const layout = buildFamilyTreeLayout({
    graph: familyGraph,
    limits: { lateralFamilyGenerations: 1, partners: null },
    measurements: Object.fromEntries(Object.keys(familyGraph.people).map((personId) => [personId, { width: 132, height: 52 }])),
    spacing: { row: 96, column: 44, padding: 48 },
  });

  expect(new Set(layout.cards.map((card) => card.personId)).size).toBe(layout.cards.length);
  expectLayoutInvariants(layout);
});

test("org chart stress layout satisfies core geometric invariants", () => {
  const people = {
    ceo: { name: "CEO" },
    ops: { name: "Ops" },
    eng: { name: "Eng" },
    design: { name: "Design" },
    web: { name: "Web" },
    data: { name: "Data" },
    brand: { name: "Brand" },
  };
  const layout = buildOrgChartLayout({
    people,
    root: "ceo",
    relationships: [
      org.reports("ceo", ["ops", "eng", "design"]),
      org.reports("eng", ["web", "data"]),
      org.reports("design", ["brand"]),
    ],
    measurements: Object.fromEntries(Object.keys(people).map((personId) => [personId, { width: 132, height: 72 }])),
    spacing: { row: 86, column: 36, padding: 48 },
  });

  expectLayoutInvariants(layout);
});
