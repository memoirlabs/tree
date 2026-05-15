import type { FamilyMember, FamilyTreeLayoutDensity, FamilyTreeLayoutStrategy } from "./types";

export type FamilyTreeNodeRole = "parent" | "sibling" | "root" | "spouse" | "child";

export interface FamilyTreeLayoutItem {
  member: FamilyMember;
  role: FamilyTreeNodeRole;
  isRoot: boolean;
  className: string;
}

export interface FamilyTreeLayoutRow {
  id: string;
  className: string;
  innerClassName?: string;
  items: FamilyTreeLayoutItem[];
}

export interface FamilyTreeLayoutModel {
  strategy: FamilyTreeLayoutStrategy;
  density: FamilyTreeLayoutDensity;
  verticalGapClassName: string;
  rows: FamilyTreeLayoutRow[];
}

export interface BuildFamilyTreeLayoutOptions {
  strategy?: FamilyTreeLayoutStrategy;
  density?: FamilyTreeLayoutDensity;
}

const roleAnimationClassNames: Record<FamilyTreeNodeRole, string> = {
  parent: "relative animate-in fade-in slide-in-from-top-4 duration-500",
  sibling: "relative animate-in fade-in slide-in-from-left-4 duration-500",
  root: "relative animate-in fade-in zoom-in-95 duration-500",
  spouse: "relative animate-in fade-in slide-in-from-right-4 duration-500",
  child: "relative animate-in fade-in slide-in-from-bottom-4 duration-500",
};

const createItem = (member: FamilyMember, role: FamilyTreeNodeRole): FamilyTreeLayoutItem => ({
  member,
  role,
  isRoot: role === "root",
  className: roleAnimationClassNames[role],
});

/**
 * Build the render rows for the built-in family tree layout.
 */
export function buildFamilyTreeLayout(
  rootMember: FamilyMember,
  options: BuildFamilyTreeLayoutOptions = {},
): FamilyTreeLayoutModel {
  const strategy = options.strategy ?? "generation";
  const density = options.density ?? "comfortable";
  const horizontalGapClassName = density === "compact" ? "gap-6" : "gap-8";
  const verticalGapClassName = density === "compact" ? "gap-8" : "gap-12";
  const rows: FamilyTreeLayoutRow[] = [];

  const parents = rootMember.parents ?? [];
  if (parents.length > 0) {
    rows.push({
      id: "parents",
      className: `flex ${horizontalGapClassName} justify-center`,
      items: parents.map((parent) => createItem(parent, "parent")),
    });
  }

  const siblings = rootMember.siblings ?? [];
  const leftCount = Math.ceil(siblings.length / 2);
  const leftSiblings = siblings.slice(0, leftCount);
  const rightSiblings = siblings.slice(leftCount);
  const currentItems: FamilyTreeLayoutItem[] = [
    ...leftSiblings.map((sibling) => createItem(sibling, "sibling")),
    createItem(rootMember, "root"),
  ];

  if (rootMember.spouse) {
    currentItems.push(createItem(rootMember.spouse, "spouse"));
  }

  currentItems.push(
    ...rightSiblings.map((sibling) => ({
      ...createItem(sibling, "sibling"),
      className: roleAnimationClassNames.spouse,
    })),
  );

  rows.push({
    id: "current",
    className: `flex items-center justify-center ${horizontalGapClassName}`,
    innerClassName: `relative inline-flex items-center ${horizontalGapClassName}`,
    items: currentItems,
  });

  const children = rootMember.children ?? [];
  if (children.length > 0) {
    rows.push({
      id: "children",
      className: `flex ${horizontalGapClassName} justify-center`,
      items: children.map((child) => createItem(child, "child")),
    });
  }

  return {
    strategy: strategy === "auto" ? "generation" : strategy,
    density,
    verticalGapClassName,
    rows,
  };
}
