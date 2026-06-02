import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, rel } from "../src/index";

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

test("marks separated and divorced partnership lines", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships: [
      rel.partner("henry", "emma", { status: "separated" }),
      rel.partner("henry", "carol", { status: "divorced" }),
    ],
  });

  expect(layout.edges.filter((edge) => edge.kind === "separated-marker")).toHaveLength(1);
  expect(layout.edges.filter((edge) => edge.kind === "divorced-marker")).toHaveLength(2);
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

test("hides descendant branch rows for collapsed family cards", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships,
    collapsed: ["ava"],
  });

  expect(layout.cards.map((card) => card.personId)).toContain("ava");
  expect(layout.cards.map((card) => card.personId)).not.toContain("noah");
  expect(layout.edges.every((edge) => edge.sourceId !== "ava" && edge.targetId !== "noah")).toBe(true);
});

test("keeps guardian edges distinct when the guardian is already a parent", () => {
  const layout = buildFamilyTreeLayout({
    subject: "ava",
    people,
    relationships: [
      rel.parents("ava", ["henry", "emma"]),
      rel.guardians("ava", ["henry"]),
    ],
  });

  const henryToAvaEdges = layout.edges.filter((edge) => edge.sourceId === "henry" && edge.targetId === "ava");
  expect(henryToAvaEdges).toHaveLength(2);
  expect(henryToAvaEdges.map((edge) => edge.kind)).toEqual(expect.arrayContaining(["biological", "guardian"]));
});
