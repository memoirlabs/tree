import type { TreeStylePreset } from "./types";

export const treeStylePresets = ["memoir", "system"] as const satisfies readonly TreeStylePreset[];

export function getTreeStyleName(theme: TreeStylePreset | undefined): TreeStylePreset {
  if (theme === undefined) return "memoir";
  return theme;
}
