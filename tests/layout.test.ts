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

function maxCardX(layout: { cards: Array<{ x: number; width: number }> }) {
  return Math.max(...layout.cards.map((card) => card.x + card.width));
}

function maxCardY(layout: { cards: Array<{ y: number; height: number }> }) {
  return Math.max(...layout.cards.map((card) => card.y + card.height));
}

function cardCenterX(layout: { cards: Array<{ personId: string; x: number; width: number }> }, personId: string) {
  const card = layout.cards.find((candidate) => candidate.personId === personId);
  expect(card).toBeDefined();
  return (card?.x ?? 0) + (card?.width ?? 0) / 2;
}

function expectSubjectNearCanvasCenter(
  layout: { bounds: { width: number }; cards: Array<{ personId: string; x: number; width: number }> },
  personId: string,
) {
  expect(Math.abs(cardCenterX(layout, personId) - layout.bounds.width / 2)).toBeLessThanOrEqual(0.5);
}

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

test("keeps the requested subject near the horizontal center of the family bounds", () => {
  const family = {
    childA: { id: "childA", name: "Child A" },
    childB: { id: "childB", name: "Child B" },
    grandchild: { id: "grandchild", name: "Grandchild" },
    parentA: { id: "parentA", name: "Parent A" },
    parentB: { id: "parentB", name: "Parent B" },
    partner: { id: "partner", name: "Partner" },
    subject: { id: "subject", name: "Subject" },
  };
  const familyRelationships = [
    rel.parents("subject", ["parentA", "parentB"]),
    rel.partner("subject", "partner"),
    rel.children(["subject", "partner"], ["childA", "childB"]),
    rel.children(["childA"], ["grandchild"]),
  ];

  expectSubjectNearCanvasCenter(
    buildFamilyTreeLayout({ people: family, relationships: familyRelationships, subject: "subject" }),
    "subject",
  );
  expectSubjectNearCanvasCenter(
    buildFamilyTreeLayout({ people: family, relationships: familyRelationships, subject: "parentA" }),
    "parentA",
  );
  expectSubjectNearCanvasCenter(
    buildFamilyTreeLayout({ people: family, relationships: familyRelationships, subject: "grandchild" }),
    "grandchild",
  );
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

test("uses roomier default family spacing without changing padding", () => {
  const singleCardLayout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships: [],
    measurements: {
      henry: { width: 100, height: 60 },
    },
  });
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships: [
      rel.parents("henry", ["carol", "james"]),
      rel.partner("henry", "emma"),
      rel.children(["henry", "emma"], ["ava"]),
    ],
    measurements: {
      ava: { width: 100, height: 60 },
      carol: { width: 100, height: 60 },
      emma: { width: 100, height: 60 },
      henry: { width: 100, height: 60 },
      james: { width: 100, height: 60 },
    },
  });

  const card = (personId: string) => layout.cards.find((candidate) => candidate.personId === personId);
  const gapBetween = (leftId: string, rightId: string) => {
    const left = card(leftId);
    const right = card(rightId);
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    return (right?.x ?? 0) - ((left?.x ?? 0) + (left?.width ?? 0));
  };

  expect(Math.min(...singleCardLayout.cards.map((layoutCard) => layoutCard.x))).toBe(24);
  expect(Math.min(...singleCardLayout.cards.map((layoutCard) => layoutCard.y))).toBe(24);
  expect(Math.min(...layout.cards.map((layoutCard) => layoutCard.y))).toBe(24);
  expect(gapBetween("carol", "james")).toBe(40);
  expect(gapBetween("henry", "emma")).toBe(40);
  expect((card("henry")?.y ?? 0) - ((card("carol")?.y ?? 0) + (card("carol")?.height ?? 0))).toBe(104);
});

test("computes final family bounds from shifted cards", () => {
  const padding = 36;
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
      rel.children(["ava"], ["noah"], { order: 3 }),
    ],
    measurements: {
      ava: { width: 92, height: 60 },
      carol: { width: 124, height: 60 },
      emma: { width: 124, height: 60 },
      henry: { width: 160, height: 72 },
      liam: { width: 92, height: 60 },
      noah: { width: 92, height: 60 },
    },
    spacing: {
      column: 56,
      padding,
      row: 88,
    },
  });

  expect(layout.bounds.width).toBeGreaterThanOrEqual(maxCardX(layout) + padding);
  expect(layout.bounds.height).toBeGreaterThanOrEqual(maxCardY(layout) + padding);
});

test("keeps multiple right-side relatives inside family bounds", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      liam: { id: "liam", name: "Liam" },
      mia: { id: "mia", name: "Mia" },
      zoe: { id: "zoe", name: "Zoe" },
    },
    relationships: [
      rel.partner("henry", "emma", { order: 1 }),
      rel.partner("henry", "carol", { order: 2 }),
      rel.partner("henry", "mia", { order: 3 }),
      rel.children(["henry", "emma"], ["ava"], { order: 1 }),
      rel.children(["henry", "carol"], ["liam"], { order: 2 }),
      rel.children(["henry", "mia"], ["zoe"], { order: 3 }),
    ],
    measurements: {
      ava: { width: 80, height: 60 },
      carol: { width: 120, height: 60 },
      emma: { width: 120, height: 60 },
      henry: { width: 140, height: 70 },
      liam: { width: 80, height: 60 },
      mia: { width: 120, height: 60 },
      zoe: { width: 80, height: 60 },
    },
    spacing: {
      column: 64,
      padding: 28,
      row: 84,
    },
  });

  expect(layout.cards.every((card) => card.x + card.width <= layout.bounds.width)).toBe(true);
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

test("uses configurable estimated family card size before measurement", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people,
    relationships: [rel.partner("henry", "emma")],
    estimatedCardSize: { width: 88, height: 64 },
  });

  expect(layout.cards.find((card) => card.personId === "henry")).toMatchObject({
    width: 88,
    height: 64,
  });
  expect(layout.cards.find((card) => card.personId === "emma")).toMatchObject({
    width: 88,
    height: 64,
  });
});

test("does not infer connector-only cards from app-owned placeholder fields", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      unknownParent: { id: "unknownParent", name: "Unknown parent", isPlaceholder: true, hiddenCard: true },
    },
    relationships: [
      rel.children(["henry", "unknownParent"], ["ava"], {
        relation: "unknown",
        status: "unknown",
      }),
    ],
    estimatedCardSize: { width: 88, height: 64 },
  });

  const unknownParent = layout.cards.find((card) => card.personId === "unknownParent");

  expect(unknownParent).toMatchObject({
    width: 88,
    height: 64,
  });
  expect(unknownParent?.hiddenCard).toBeUndefined();
  expect(layout.edges.filter((edge) => edge.targetId === "ava")).toHaveLength(1);
});

test("hides connector-only parents through the explicit render predicate", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      unknownParent: { id: "unknownParent", name: "Unknown parent", isPlaceholder: true },
    },
    relationships: [
      rel.partner("henry", "unknownParent", { relation: "unknown", status: "unknown" }),
      rel.children(["henry", "unknownParent"], ["ava"], {
        relation: "unknown",
        status: "unknown",
      }),
    ],
    shouldRenderPersonCard: (_person, personId) => personId !== "unknownParent",
  });

  expect(layout.cards.find((card) => card.personId === "unknownParent")?.hiddenCard).toBe(true);
  expect(layout.edges.some((edge) => edge.sourceId === "henry" && edge.targetId === "unknownParent")).toBe(false);
  expect(layout.edges.filter((edge) => edge.targetId === "ava")).toHaveLength(1);
});

test("compact family layout does not hide unknown-looking people by itself", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      unknownParent: { id: "unknownParent", name: "Unknown parent", isPlaceholder: true },
    },
    relationships: [
      rel.partner("henry", "unknownParent", { relation: "unknown", status: "unknown" }),
      rel.children(["henry", "unknownParent"], ["ava"], {
        relation: "unknown",
        status: "unknown",
      }),
    ],
    layoutMode: "compact-family",
  });

  expect(layout.cards.find((card) => card.personId === "unknownParent")?.hiddenCard).toBeUndefined();
});

test("separates sibling and spouse clusters in compact family layout", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      charlie: { id: "charlie", name: "Charlie" },
    },
    relationships: [
      rel.parents("henry", ["carol", "james"]),
      rel.parents("charlie", ["carol", "james"]),
      rel.partner("henry", "emma", { relation: "spouse" }),
      rel.children(["henry", "emma"], ["ava"]),
    ],
    estimatedCardSize: { width: 88, height: 64 },
    layoutMode: "compact-family",
    spacing: { column: 20, row: 48, padding: 24 },
  });
  const card = (personId: string) => layout.cards.find((candidate) => candidate.personId === personId);
  const charlie = card("charlie");
  const henry = card("henry");
  const emma = card("emma");

  expect(charlie).toBeDefined();
  expect(henry).toBeDefined();
  expect(emma).toBeDefined();
  expect((charlie?.x ?? 0) + (charlie?.width ?? 0)).toBeLessThan(henry?.x ?? 0);
  expect(emma?.x ?? 0).toBeGreaterThan((henry?.x ?? 0) + (henry?.width ?? 0));
  expect((henry?.x ?? 0) - ((charlie?.x ?? 0) + (charlie?.width ?? 0))).toBeGreaterThan(20);
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

test("balances multiple partners around the subject row", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      iris: { id: "iris", name: "Iris" },
      liam: { id: "liam", name: "Liam" },
      mia: { id: "mia", name: "Mia" },
    },
    relationships: [
      rel.partner("henry", "carol", { order: 1 }),
      rel.partner("henry", "emma", { order: 2 }),
      rel.partner("henry", "iris", { order: 3 }),
      rel.partner("henry", "liam", { order: 4 }),
    ],
    measurements: {
      carol: { width: 80, height: 60 },
      emma: { width: 80, height: 60 },
      henry: { width: 80, height: 60 },
      iris: { width: 80, height: 60 },
      liam: { width: 80, height: 60 },
    },
    limits: {
      partners: null,
    },
  });

  const centerX = (personId: string) => {
    const card = layout.cards.find((candidate) => candidate.personId === personId);
    expect(card).toBeDefined();
    return (card?.x ?? 0) + (card?.width ?? 0) / 2;
  };
  const subjectCenter = centerX("henry");

  expect(["carol", "emma"].map(centerX).every((x) => x < subjectCenter)).toBe(true);
  expect(["iris", "liam"].map(centerX).every((x) => x > subjectCenter)).toBe(true);
});

test("keeps child-bearing partners closest to the subject anchors", () => {
  const layout = buildFamilyTreeLayout({
    subject: "henry",
    people: {
      ...people,
      iris: { id: "iris", name: "Iris" },
      liam: { id: "liam", name: "Liam" },
      mia: { id: "mia", name: "Mia" },
      zoe: { id: "zoe", name: "Zoe" },
    },
    relationships: [
      rel.partner("henry", "carol", { order: 1 }),
      rel.partner("henry", "emma", { order: 2 }),
      rel.partner("henry", "iris", { order: 3 }),
      rel.children(["henry", "iris"], ["liam"], { order: 4 }),
      rel.children(["henry", "emma"], ["mia"], { order: 5 }),
    ],
    limits: {
      partners: null,
    },
  });
  const row = layout.cards
    .filter((card) => card.relation.side === "self" || card.relation.side === "partner")
    .toSorted((a, b) => a.x - b.x)
    .map((card) => card.personId);
  const subjectIndex = row.indexOf("henry");

  expect(row[subjectIndex - 1]).toBe("iris");
  expect(row[subjectIndex + 1]).toBe("emma");
  expect(row).toContain("carol");
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
