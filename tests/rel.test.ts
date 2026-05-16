import { expect, test } from "bun:test";

import { rel } from "../src/index";

test("creates parentage helper rows", () => {
  expect(rel.parents("henry", ["carol", "james"])).toEqual({
    type: "parentage",
    parents: ["carol", "james"],
    children: ["henry"],
    relation: "biological",
  });
});

test("creates partnership and guardianship helper rows", () => {
  expect(rel.partner("henry", "emma", { relation: "spouse" })).toMatchObject({
    type: "partnership",
    partners: ["henry", "emma"],
    relation: "spouse",
  });
  expect(rel.guardians("ava", ["carol"])).toMatchObject({
    type: "guardianship",
    guardians: ["carol"],
    children: ["ava"],
    relation: "guardian",
  });
});
