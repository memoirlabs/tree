import { expect, test } from "bun:test";

import { getTreeStyleName, treeStylePresets } from "../src/index";

test("exposes simple style presets", () => {
  expect(treeStylePresets).toEqual(["memoir", "system"]);
  expect(getTreeStyleName(undefined)).toBe("memoir");
  expect(getTreeStyleName("system")).toBe("system");
});
