import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, buildLayeredTreeLayout, rel } from "../src/index";

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

test("anchors child groups to the correct partner pair when the subject has multiple partners", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      liam: { id: "liam", name: "Liam" },
    },
    relationships: [
      rel.partner("henry", "emma", { order: 1 }),
      rel.partner("henry", "carol", { order: 2 }),
      rel.children(["henry", "emma"], ["ava"], { order: 1 }),
      rel.children(["henry", "carol"], ["liam"], { order: 2 }),
    ],
    measurements: {
      ava: { width: 24, height: 60 },
      carol: { width: 100, height: 60 },
      emma: { width: 100, height: 60 },
      henry: { width: 100, height: 60 },
      liam: { width: 24, height: 60 },
    },
  });

  const centerX = (personId: string) => {
    const card = layout.cards.find((layoutCard) => layoutCard.personId === personId);
    expect(card).toBeDefined();
    return (card?.x ?? 0) + (card?.width ?? 0) / 2;
  };

  expect(centerX("ava")).toBe((centerX("henry") + centerX("emma")) / 2);
  expect(centerX("liam")).toBe((centerX("henry") + centerX("carol")) / 2);
});

test("orders multiple child groups by their visible parent anchors", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      liam: { id: "liam", name: "Liam" },
    },
    relationships: [
      rel.partner("henry", "emma", { order: 1 }),
      rel.partner("henry", "carol", { order: 2 }),
      rel.children(["henry", "emma"], ["ava"], { order: 1 }),
      rel.children(["henry", "carol"], ["liam"], { order: 2 }),
    ],
  });

  const cardX = (personId: string) => layout.cards.find((card) => card.personId === personId)?.x ?? 0;

  expect(cardX("ava")).toBeLessThan(cardX("liam"));
});

test("builds lower-level layered layouts with internal anchor points", () => {
  const layout = buildLayeredTreeLayout({
    spacing: { row: 80, column: 24, padding: 16 },
    layers: [
      [
        {
          id: "parents",
          width: 224,
          height: 80,
          anchorPoints: [
            { id: "parent-a", offsetX: 50 },
            { id: "parent-b", offsetX: 174 },
          ],
        },
      ],
      [{ id: "child", width: 100, height: 60, anchorIds: ["parent-a", "parent-b"] }],
    ],
  });

  const parents = layout.boxes.find((box) => box.id === "parents");
  const child = layout.boxes.find((box) => box.id === "child");

  expect(child?.x).toBe(parents ? parents.x + 62 : undefined);
  expect(layout.bounds.width).toBeGreaterThan(0);
});
