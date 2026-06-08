import { expect, test } from "bun:test";

import { buildOrgChartLayout, graphToOrgReportingRelationships, org } from "../src/index";

const people = {
  ceo: { name: "Casey" },
  eng: { name: "Morgan" },
  design: { name: "Riley" },
  lead: { name: "Avery" },
};

const relationships = [
  org.reports("ceo", ["eng", "design"]),
  org.reports("eng", ["lead"]),
];

test("builds measured org chart layout cards", () => {
  const layout = buildOrgChartLayout({
    root: "ceo",
    people,
    relationships,
    measurements: {
      ceo: { width: 240, height: 90 },
    },
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["ceo", "design", "eng", "lead"]);
  expect(layout.cards.find((card) => card.personId === "ceo")).toMatchObject({
    depth: 0,
  });
  expect(layout.cards.find((card) => card.personId === "lead")).toMatchObject({
    depth: 2,
    parentId: "eng",
  });
  expect(layout.edges).toHaveLength(3);
});

test("supports collapse, max depth, and curved edges", () => {
  const collapsed = buildOrgChartLayout({
    root: "ceo",
    people,
    relationships,
    collapsed: ["eng"],
  });
  expect(collapsed.cards.map((card) => card.personId)).not.toContain("lead");

  const shallow = buildOrgChartLayout({
    root: "ceo",
    people,
    relationships,
    maxDepth: 1,
  });
  expect(shallow.cards.map((card) => card.personId)).not.toContain("lead");

  const curved = buildOrgChartLayout({
    root: "ceo",
    people,
    relationships,
    lineShape: "curved",
  });
  expect(curved.edges.some((edge) => edge.path.includes(" C "))).toBe(true);
});

test("builds org layout from explicit reporting graph links", () => {
  const graph = {
    people,
    root: "ceo",
    reportingLinks: [
      { id: "ceo-eng", managerId: "ceo", reportId: "eng", order: 2 },
      { id: "ceo-design", managerId: "ceo", reportId: "design", order: 1 },
      { id: "eng-lead", managerId: "eng", reportId: "lead", order: 1 },
    ],
  };
  const layout = buildOrgChartLayout({ graph });

  expect(graphToOrgReportingRelationships(graph).map((relationship) => relationship.reportIds)).toEqual([
    ["eng"],
    ["design"],
    ["lead"],
  ]);
  expect(layout.cards.map((card) => card.personId)).toEqual(["ceo", "design", "eng", "lead"]);
  expect(layout.edges.map((edge) => edge.id)).toEqual(["ceo-design", "ceo-eng", "eng-lead"]);
});

test("preserves org relationship metadata on layout edges", () => {
  const layout = buildOrgChartLayout({
    graph: {
      people,
      root: "ceo",
      reportingLinks: [
        {
          id: "former-ceo-eng",
          managerId: "ceo",
          reportId: "eng",
          relation: "direct",
          status: "former",
        },
      ],
    },
  });

  expect(layout.edges).toEqual([
    expect.objectContaining({
      id: "former-ceo-eng",
      kind: "direct",
      status: "former",
      sourceId: "ceo",
      targetId: "eng",
    }),
  ]);
});
