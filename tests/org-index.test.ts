import { expect, test } from "bun:test";

import { collectOrgChartSubtree, createOrgChartIndex, org } from "../src/index";

const people = {
  ceo: { name: "Casey" },
  eng: { name: "Morgan" },
  design: { name: "Riley" },
  lead: { name: "Avery" },
  outside: { name: "Outside" },
};

test("collects a rooted org subtree", () => {
  const index = createOrgChartIndex(people, [
    org.reports("ceo", ["eng", "design"]),
    org.reports("eng", ["lead"]),
    org.reports("outside", ["ceo"]),
  ]);

  const subtree = collectOrgChartSubtree(index, "ceo");

  expect(subtree.map((relative) => relative.personId)).toEqual(["ceo", "design", "eng", "lead"]);
  expect(subtree.find((relative) => relative.personId === "lead")).toMatchObject({
    depth: 2,
    parentId: "eng",
  });
});

test("rejects multiple managers for one report", () => {
  expect(() =>
    createOrgChartIndex(people, [
      org.reports("ceo", ["lead"]),
      org.reports("eng", ["lead"]),
    ]),
  ).toThrow("multiple managers");
});

test("rejects reporting cycles", () => {
  const index = createOrgChartIndex(people, [
    org.reports("ceo", ["eng"]),
    org.reports("eng", ["lead"]),
    org.reports("lead", ["ceo"]),
  ]);

  expect(() => collectOrgChartSubtree(index, "ceo")).toThrow("cycle");
});
