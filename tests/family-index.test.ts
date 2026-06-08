import { expect, test } from "bun:test";

import { collectFamilyNeighborhood, createFamilyIndex, rel } from "../src/index";

const people = {
  henry: { id: "henry" },
  carol: { id: "carol" },
  james: { id: "james" },
  ruth: { id: "ruth" },
  sam: { id: "sam" },
  sarah: { id: "sarah" },
  emma: { id: "emma" },
  ava: { id: "ava" },
  noah: { id: "noah" },
  milo: { id: "milo" },
  robin: { id: "robin" },
  guardian: { id: "guardian" },
};

const relationships = [
  rel.parents("carol", ["ruth"]),
  rel.parents("henry", ["carol", "james"]),
  rel.parents("sam", ["carol", "james"]),
  rel.parents("sarah", ["james"]),
  rel.partner("henry", "emma"),
  rel.guardians("henry", ["guardian"]),
  rel.children(["henry", "robin"], ["milo"]),
  rel.children(["henry", "emma"], ["ava"]),
  rel.children(["ava"], ["noah"]),
];

test("collects subject-centered relatives and computed labels", () => {
  const index = createFamilyIndex(people, relationships);
  const neighborhood = collectFamilyNeighborhood(index, "henry");

  expect(neighborhood?.parents.map((relative) => relative.personId)).toEqual(["carol", "guardian", "james"]);
  expect(neighborhood?.parents.find((relative) => relative.personId === "guardian")?.relation.label).toBe("guardian");
  expect(neighborhood?.grandparents.map((relative) => relative.personId)).toEqual(["ruth"]);
  expect(neighborhood?.siblings.map((relative) => relative.personId)).toEqual(["sam"]);
  expect(neighborhood?.halfSiblings.map((relative) => relative.personId)).toEqual(["sarah"]);
  expect(neighborhood?.partners.map((relative) => relative.personId)).toEqual(["emma", "robin"]);
  expect(neighborhood?.partners.find((relative) => relative.personId === "emma")?.relation.label).toBe("partner");
  expect(neighborhood?.partners.find((relative) => relative.personId === "robin")?.relation.label).toBe("coparent");
  expect(neighborhood?.children.map((relative) => relative.personId)).toEqual(["ava", "milo"]);
  expect(neighborhood?.grandchildren.map((relative) => relative.personId)).toEqual(["noah"]);
  expect(neighborhood?.halfSiblings[0]?.relation.label).toBe("half-sibling");
});

test("accepts explicit neighborhood limits", () => {
  const index = createFamilyIndex(people, relationships);
  const capped = collectFamilyNeighborhood(index, "henry", { children: 1 });
  const uncapped = collectFamilyNeighborhood(index, "henry", { children: null });

  expect(capped?.children.map((relative) => relative.personId)).toEqual(["ava"]);
  expect(uncapped?.children.map((relative) => relative.personId)).toEqual(["ava", "milo"]);
});

test("collects configured ancestor and descendant generations", () => {
  const deepPeople = {
    self: { id: "self" },
    p1: { id: "p1" },
    p2: { id: "p2" },
    p3: { id: "p3" },
    p4: { id: "p4" },
    p5: { id: "p5" },
    c1: { id: "c1" },
    c2: { id: "c2" },
    c3: { id: "c3" },
    c4: { id: "c4" },
    c5: { id: "c5" },
  };
  const index = createFamilyIndex(deepPeople, [
    rel.parents("self", ["p1"]),
    rel.parents("p1", ["p2"]),
    rel.parents("p2", ["p3"]),
    rel.parents("p3", ["p4"]),
    rel.parents("p4", ["p5"]),
    rel.parents("c1", ["self"]),
    rel.parents("c2", ["c1"]),
    rel.parents("c3", ["c2"]),
    rel.parents("c4", ["c3"]),
    rel.parents("c5", ["c4"]),
  ]);
  const neighborhood = collectFamilyNeighborhood(index, "self", {
    ancestorGenerations: 5,
    descendantGenerations: 5,
  });

  expect(neighborhood?.ancestorGenerations.map((layer) => layer.relatives.map((relative) => relative.personId))).toEqual([
    ["p1"],
    ["p2"],
    ["p3"],
    ["p4"],
    ["p5"],
  ]);
  expect(neighborhood?.descendantGenerations.map((layer) => layer.relatives.map((relative) => relative.personId))).toEqual([
    ["c1"],
    ["c2"],
    ["c3"],
    ["c4"],
    ["c5"],
  ]);
  expect(neighborhood?.ancestorGenerations[2]?.relatives[0]?.relation.label).toBe("ancestor");
  expect(neighborhood?.descendantGenerations[2]?.relatives[0]?.relation.label).toBe("descendant");
});

test("collects nearby lateral family parents for half-siblings", () => {
  const index = createFamilyIndex(
    {
      self: { id: "self" },
      sharedParent: { id: "sharedParent" },
      halfSibling: { id: "halfSibling" },
      halfSiblingParent: { id: "halfSiblingParent" },
    },
    [
      rel.parents("self", ["sharedParent"]),
      rel.parents("halfSibling", ["sharedParent", "halfSiblingParent"]),
    ],
  );
  const neighborhood = collectFamilyNeighborhood(index, "self", { lateralFamilyGenerations: 2 });

  expect(neighborhood?.parents.map((relative) => relative.personId)).toEqual(["halfSiblingParent", "sharedParent"]);
  expect(neighborhood?.parents.find((relative) => relative.personId === "halfSiblingParent")?.relation.side).toBe("other");
});

test("collects immediate lateral branches when intermediate relatives exist", () => {
  const index = createFamilyIndex(
    {
      self: { id: "self" },
      parent: { id: "parent" },
      grandparent: { id: "grandparent" },
      aunt: { id: "aunt" },
      cousin: { id: "cousin" },
      sibling: { id: "sibling" },
      niece: { id: "niece" },
    },
    [
      rel.parents("parent", ["grandparent"]),
      rel.parents("aunt", ["grandparent"]),
      rel.parents("self", ["parent"]),
      rel.parents("sibling", ["parent"]),
      rel.parents("cousin", ["aunt"]),
      rel.parents("niece", ["sibling"]),
    ],
  );
  const neighborhood = collectFamilyNeighborhood(index, "self", { lateralFamilyGenerations: 1 });

  expect(neighborhood?.auntsUncles.map((relative) => relative.personId)).toEqual(["aunt"]);
  expect(neighborhood?.auntsUncles[0]?.relation).toMatchObject({ label: "aunt-uncle", generation: -1, side: "other" });
  expect(neighborhood?.cousins.map((relative) => relative.personId)).toEqual(["cousin"]);
  expect(neighborhood?.cousins[0]?.relation).toMatchObject({ label: "cousin", generation: 0, side: "other" });
  expect(neighborhood?.niecesNephews.map((relative) => relative.personId)).toEqual(["niece"]);
  expect(neighborhood?.niecesNephews[0]?.relation).toMatchObject({
    label: "niece-nephew",
    generation: 1,
    side: "other",
  });
});

test("does not collect lateral branch relatives by default", () => {
  const index = createFamilyIndex(
    {
      self: { id: "self" },
      parent: { id: "parent" },
      grandparent: { id: "grandparent" },
      aunt: { id: "aunt" },
      cousin: { id: "cousin" },
    },
    [
      rel.parents("parent", ["grandparent"]),
      rel.parents("aunt", ["grandparent"]),
      rel.parents("self", ["parent"]),
      rel.parents("cousin", ["aunt"]),
    ],
  );
  const neighborhood = collectFamilyNeighborhood(index, "self");

  expect(neighborhood?.auntsUncles).toEqual([]);
  expect(neighborhood?.cousins).toEqual([]);
  expect(neighborhood?.niecesNephews).toEqual([]);
});

test("treats null lateral generation limit as uncapped", () => {
  const index = createFamilyIndex(
    {
      self: { id: "self" },
      sibling: { id: "sibling" },
      parent: { id: "parent" },
      niece: { id: "niece" },
      grandNiece: { id: "grandNiece" },
    },
    [
      rel.parents("self", ["parent"]),
      rel.parents("sibling", ["parent"]),
      rel.parents("niece", ["sibling"]),
      rel.parents("grandNiece", ["niece"]),
    ],
  );
  const neighborhood = collectFamilyNeighborhood(index, "self", {
    descendantGenerations: 2,
    lateralFamilyGenerations: null,
  });

  expect(neighborhood?.descendantGenerations.map((layer) => layer.relatives.map((relative) => relative.personId))).toEqual([
    ["niece"],
    ["grandNiece"],
  ]);
});

test("rejects parentage cycles", () => {
  expect(() =>
    createFamilyIndex(people, [
      rel.parents("henry", ["carol"]),
      rel.parents("carol", ["henry"]),
    ]),
  ).toThrow("parentage cycle");
});
