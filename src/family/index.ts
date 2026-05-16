export { DefaultFamilyCard, FamilyTree } from "./FamilyTree";
export { rel } from "./rel";
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
  GuardianshipRelation,
  ParentageRelation,
  PartnershipRelation,
  PeopleById,
  PersonId,
} from "./types";

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
