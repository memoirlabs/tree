import { expect, test } from "bun:test";

import { org } from "../src/index";

test("creates reporting helper rows", () => {
  expect(org.reports("ceo", ["eng", "sales"], { order: 1 })).toEqual({
    type: "reporting",
    managerId: "ceo",
    reportIds: ["eng", "sales"],
    relation: "manager",
    status: "current",
    order: 1,
  });
});
