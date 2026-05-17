import { describe, expect, test } from "bun:test";

import { buildOrgChartLayout, createOrgChart } from "../src/index";

type Person = {
  name: string;
  role: string;
};

describe("createOrgChart", () => {
  test("creates a single-root chart", () => {
    const chart = createOrgChart<Person>({
      id: "founder",
      person: { name: "Avery", role: "Founder" },
    });

    expect(chart).toEqual({
      rootId: "founder",
      nodes: [{ id: "founder", person: { name: "Avery", role: "Founder" }, parentId: null, order: 0 }],
      generations: [{ generation: 0, personIds: ["founder"], count: 1 }],
      maxGeneration: 0,
      reportLines: [],
    });
  });

  test("preserves report order for wide teams", () => {
    const chart = createOrgChart<Person>({
      id: "ceo",
      person: { name: "Avery", role: "CEO" },
      reports: [
        { id: "product", person: { name: "Morgan", role: "Product" } },
        { id: "eng", person: { name: "Casey", role: "Engineering" } },
        { id: "design", person: { name: "Riley", role: "Design" } },
      ],
    });

    expect(chart.nodes.map((node) => node.id)).toEqual(["ceo", "product", "eng", "design"]);
    expect(chart.generations).toEqual([
      { generation: 0, personIds: ["ceo"], count: 1 },
      { generation: 1, personIds: ["product", "eng", "design"], count: 3 },
    ]);
    expect(chart.reportLines).toEqual([
      { managerId: "ceo", reportId: "product" },
      { managerId: "ceo", reportId: "eng" },
      { managerId: "ceo", reportId: "design" },
    ]);
  });

  test("tracks how far a deep reporting chain goes", () => {
    const chart = createOrgChart<Person>({
      id: "ceo",
      person: { name: "Avery", role: "CEO" },
      reports: [
        {
          id: "vp-eng",
          person: { name: "Morgan", role: "VP Engineering" },
          reports: [
            {
              id: "platform",
              person: { name: "Casey", role: "Platform Lead" },
              reports: [{ id: "infra", person: { name: "Noel", role: "Infra" } }],
            },
          ],
        },
      ],
    });

    expect(chart.maxGeneration).toBe(3);
    expect(chart.generations.map((generation) => generation.personIds)).toEqual([
      ["ceo"],
      ["vp-eng"],
      ["platform"],
      ["infra"],
    ]);
  });

  test("honors explicit sibling order values", () => {
    const chart = createOrgChart<Person>({
      id: "ceo",
      person: { name: "Avery", role: "CEO" },
      reports: [
        { id: "design", order: 20, person: { name: "Riley", role: "Design" } },
        { id: "eng", order: 10, person: { name: "Casey", role: "Engineering" } },
      ],
    });

    expect(chart.nodes.map((node) => [node.id, node.order])).toEqual([
      ["ceo", 0],
      ["design", 20],
      ["eng", 10],
    ]);

    const layout = buildOrgChartLayout(chart);

    expect(layout.cards.find((card) => card.personId === "ceo")?.directReports).toEqual(["eng", "design"]);
  });

  test("feeds directly into the measured org layout", () => {
    const chart = createOrgChart<Person>({
      id: "ceo",
      person: { name: "Avery", role: "CEO" },
      reports: [
        {
          id: "eng",
          person: { name: "Casey", role: "Engineering" },
          reports: [{ id: "web", person: { name: "River", role: "Web" } }],
        },
        { id: "growth", person: { name: "Quinn", role: "Growth" } },
      ],
    });

    const layout = buildOrgChartLayout({
      ...chart,
      measurements: {
        ceo: { width: 240, height: 88 },
        eng: { width: 220, height: 80 },
        web: { width: 200, height: 76 },
        growth: { width: 220, height: 80 },
      },
    });

    expect(layout.cards).toHaveLength(4);
    expect(layout.edges.map((edge) => edge.id).toSorted()).toEqual(["ceo->eng", "ceo->growth", "eng->web"]);
    expect(layout.cards.find((card) => card.personId === "web")?.generation).toBe(2);
  });

  test("rejects duplicate person ids", () => {
    expect(() =>
      createOrgChart<Person>({
        id: "ceo",
        person: { name: "Avery", role: "CEO" },
        reports: [
          { id: "eng", person: { name: "Casey", role: "Engineering" } },
          { id: "eng", person: { name: "Morgan", role: "Engineering" } },
        ],
      }),
    ).toThrow('Duplicate org chart person id "eng".');
  });
});
