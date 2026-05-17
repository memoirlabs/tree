export { DefaultFamilyCard, DefaultOrgChartCard, FamilyTree, OrgChart, TreeSurface, rel } from "./family";
export type { ParentageOptions, PartnershipOptions, GuardianshipOptions, RelationshipHelpers } from "./family";

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
  OrgChartCardProps,
  OrgChartNode,
  OrgChartProps,
  GuardianshipRelation,
  ParentageRelation,
  PartnershipRelation,
  PeopleById,
  PersonId,
  TreeInteractionMode,
} from "./family";

export type { FamilyIndex, FamilyNeighborhood, FamilyRelative } from "./family";
export { collectFamilyNeighborhood, createFamilyIndex } from "./family";

export type {
  BuildFamilyTreeLayoutInput,
  FamilyTreeBounds,
  FamilyTreeLayoutCard,
  FamilyTreeLayoutEdge,
  FamilyTreeLayoutResult,
} from "./family";
export { buildFamilyTreeLayout } from "./family";

export type {
  BuildOrgChartLayoutInput,
  OrgChartBounds,
  OrgChartLayoutCard,
  OrgChartLayoutEdge,
  OrgChartLayoutResult,
} from "./family";
export { buildOrgChartLayout } from "./family";
