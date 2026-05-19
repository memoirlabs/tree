import { expect, test } from "bun:test";

import { createTreeThemeStyle, memoirTreeTheme, resolveTreeTheme, treeStylePresets } from "../src/index";

test("exposes Memoir as the default theme preset", () => {
  expect(resolveTreeTheme(undefined)).toBe(memoirTreeTheme);
  expect(treeStylePresets.memoir.cardRadius).toBe(0);
  expect(treeStylePresets.memoir.profileRadius).toBe(0);
  expect(treeStylePresets.memoir.edgeWidth).toBe(1);
});

test("maps custom tree themes to CSS variables", () => {
  const style = createTreeThemeStyle({
    accent: "#ff7a1a",
    cardRadius: 12,
    edge: "#111111",
    edgeWidth: 3,
    profileRadius: 999,
    surfaceBackground: "#fffdf4",
  });

  expect(style["--tree-accent"]).toBe("#ff7a1a");
  expect(style["--tree-card-radius"]).toBe(12);
  expect(style["--tree-edge"]).toBe("#111111");
  expect(style["--tree-edge-width"]).toBe(3);
  expect(style["--tree-profile-radius"]).toBe(999);
  expect(style["--tree-surface-bg"]).toBe("#fffdf4");
});
