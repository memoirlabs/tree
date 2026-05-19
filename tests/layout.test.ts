import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, buildOrgChartLayout, createOrgChart, rel } from "../src/index";

const people = {
  henry: { id: "henry", name: "Henry" },
  carol: { id: "carol", name: "Carol" },
  james: { id: "james", name: "James" },
  emma: { id: "emma", name: "Emma" },
  ava: { id: "ava", name: "Ava" },
  noah: { id: "noah", name: "Noah" },
};

const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma"),
  rel.children(["henry", "emma"], ["ava"]),
  rel.children(["ava"], ["noah"]),
];

test("builds measured subject-centered layout cards", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships,
    measurements: {
      henry: { width: 240, height: 90 },
    },
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["carol", "james", "henry", "emma", "ava", "noah"]);
  expect(layout.cards.find((card) => card.personId === "henry")?.relation).toMatchObject({
    label: "self",
    generation: 0,
  });
  expect(layout.cards.find((card) => card.personId === "noah")?.relation).toMatchObject({
    label: "grandchild",
    generation: 2,
  });
  expect(layout.bounds.width).toBeGreaterThan(0);
  expect(layout.bounds.height).toBeGreaterThan(0);
});

test("emits visible relationship edges", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships,
  });

  expect(layout.edges.map((edge) => edge.kind)).toContain("biological");
  expect(layout.edges.map((edge) => edge.kind)).toContain("partner");
  expect(layout.edges.every((edge) => edge.path.startsWith("M "))).toBe(true);
});

test("accepts custom family spacing and curved edge routing", () => {
  const compact = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships,
    lineShape: "curved",
    spacing: {
      row: 72,
      column: 16,
      padding: 12,
    },
  });
  const roomy = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships,
    spacing: {
      row: 144,
      column: 64,
      padding: 48,
    },
  });

  expect(compact.bounds.width).toBeLessThan(roomy.bounds.width);
  expect(compact.bounds.height).toBeLessThan(roomy.bounds.height);
  expect(compact.edges.some((edge) => edge.path.includes(" C "))).toBe(true);
});

test("creates org chart nodes from a nested reporting tree", () => {
  const chart = createOrgChart({
    id: "ceo",
    person: { name: "Avery", role: "CEO" },
    reports: [
      {
        id: "eng",
        person: { name: "Morgan", role: "Engineering" },
        reports: [{ id: "platform", person: { name: "Casey", role: "Platform" } }],
      },
      { id: "design", person: { name: "Riley", role: "Design" } },
    ],
  });

  expect(chart.rootId).toBe("ceo");
  expect(chart.nodes.map((node) => [node.id, node.parentId])).toEqual([
    ["ceo", null],
    ["eng", "ceo"],
    ["platform", "eng"],
    ["design", "ceo"],
  ]);
  expect(chart.generations).toEqual([
    { generation: 0, personIds: ["ceo"], count: 1 },
    { generation: 1, personIds: ["eng", "design"], count: 2 },
    { generation: 2, personIds: ["platform"], count: 1 },
  ]);
  expect(chart.maxGeneration).toBe(2);
  expect(chart.reportLines).toEqual([
    { managerId: "ceo", reportId: "eng" },
    { managerId: "eng", reportId: "platform" },
    { managerId: "ceo", reportId: "design" },
  ]);

  const layout = buildOrgChartLayout(chart);

  expect(layout.cards.find((card) => card.personId === "platform")?.generation).toBe(2);
});
