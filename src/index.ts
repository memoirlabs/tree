export { DefaultFamilyCard, FamilyTree, rel } from "./family";
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
  GuardianshipRelation,
  ParentageRelation,
  PartnershipRelation,
  PeopleById,
  PersonId,
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
