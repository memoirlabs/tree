import { describe, expect, test } from "bun:test";
import { buildOrgChartLayout } from "../src/index";

describe("buildOrgChartLayout", () => {
  test("builds a measured org chart with manager-report edges", () => {
    const layout = buildOrgChartLayout({
      nodes: [
        { id: "ceo", person: { name: "Avery" } },
        { id: "eng", person: { name: "Morgan" }, parentId: "ceo" },
        { id: "design", person: { name: "Riley" }, parentId: "ceo" },
        { id: "web", person: { name: "Casey" }, parentId: "eng" },
      ],
      measurements: {
        ceo: { width: 240, height: 88 },
        eng: { width: 220, height: 80 },
        design: { width: 220, height: 80 },
        web: { width: 200, height: 76 },
      },
    });

    expect(layout.cards).toHaveLength(4);
    expect(layout.edges).toHaveLength(3);
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);

    const ceo = layout.cards.find((card) => card.personId === "ceo");
    const web = layout.cards.find((card) => card.personId === "web");
    expect(ceo?.depth).toBe(0);
    expect(web?.depth).toBe(2);
    expect(ceo?.directReports).toEqual(["design", "eng"]);
  });
});
