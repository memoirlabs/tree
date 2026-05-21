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
