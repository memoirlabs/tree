export { DefaultFamilyCard, FamilyTree } from "./FamilyTree";
export { TreeCanvas, TreeEdges, TreeNodeLayer, TreeProvider, useTreeLayout } from "./TreePrimitives";
export { TreeSurface } from "./TreeSurface";
export { rel } from "./rel";
export { createTreeThemeStyle, getTreeStyleName, memoirTreeTheme, resolveTreeTheme, systemTreeTheme, treeStylePresets } from "./theme";
export type { ParentageOptions, PartnershipOptions, GuardianshipOptions, RelationshipHelpers } from "./rel";

export type {
  ComputedRelation,
  ComputedRelationLabel,
  ComputedRelationSide,
  FamilyCardProps,
  FamilyGuardianshipRelationship,
  FamilyParentageRelationship,
  FamilyPartnershipRelationship,
  FamilyRelationship,
  FamilyRelationshipStatus,
  FamilyTreeProps,
  FamilyTreeSize,
  FamilyTreePersonHandler,
  GuardianshipRelation,
  ParentageRelation,
  PartnershipRelation,
  PeopleById,
  PersonId,
  RenderProfileCard,
  TreeLineShape,
  TreeInteractionMode,
  TreeStylePreset,
  TreeTheme,
} from "./types";

export type {
  FamilyTreePrimitiveContext,
  FamilyTreeProviderProps,
  TreeCanvasProps,
  TreeEdgesProps,
  TreeNodeLayerProps,
  TreePrimitiveContext,
  TreePrimitiveType,
  TreeProviderProps,
} from "./TreePrimitives";

export type { FamilyIndex, FamilyNeighborhood, FamilyRelative } from "./indexing";
export { collectFamilyNeighborhood, createFamilyIndex } from "./indexing";

export type {
  BuildFamilyTreeLayoutInput,
  FamilyTreeBounds,
  FamilyTreeLayoutCard,
  FamilyTreeLayoutEdge,
  FamilyTreeLayoutResult,
} from "./layout";
export { buildFamilyTreeLayout } from "./layout";
