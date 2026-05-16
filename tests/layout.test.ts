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
