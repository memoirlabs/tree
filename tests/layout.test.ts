import { expect, test } from "bun:test";

import { buildFamilyTreeLayout } from "../src/layout";
import type { FamilyMember } from "../src/types";

const rootMember: FamilyMember = {
  id: "root",
  name: "Root",
  parents: [
    { id: "parent-1", name: "Parent 1" },
    { id: "parent-2", name: "Parent 2" },
  ],
  siblings: [
    { id: "sibling-1", name: "Sibling 1" },
    { id: "sibling-2", name: "Sibling 2" },
  ],
  spouse: { id: "spouse", name: "Spouse" },
  children: [
    { id: "child-1", name: "Child 1" },
    { id: "child-2", name: "Child 2" },
  ],
};

test("builds deterministic generation rows", () => {
  const layout = buildFamilyTreeLayout(rootMember);

  expect(layout.rows.map((row) => row.id)).toEqual(["parents", "current", "children"]);
  expect(layout.rows[0]?.items.map((item) => item.role)).toEqual(["parent", "parent"]);
  expect(layout.rows[1]?.items.map((item) => item.role)).toEqual(["sibling", "root", "spouse", "sibling"]);
  expect(layout.rows[2]?.items.map((item) => item.role)).toEqual(["child", "child"]);
});

test("uses compact spacing when requested", () => {
  const layout = buildFamilyTreeLayout(rootMember, { strategy: "auto", density: "compact" });

  expect(layout.strategy).toBe("generation");
  expect(layout.density).toBe("compact");
  expect(layout.verticalGapClassName).toBe("gap-8");
  expect(layout.rows[1]?.innerClassName).toContain("gap-6");
});
