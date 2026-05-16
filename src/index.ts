export { FamilyTree } from "./FamilyTree";
export type {
  RelationshipChartMode,
  RelationshipChartRenderNodeOptions,
  RelationshipChartLevel,
  RelationshipChartProps,
} from "./RelationshipChart";
export { RelationshipChart, buildRelationshipChartLevels } from "./RelationshipChart";

export { rel } from "./rel";
export type { ParentageOptions, PartnershipOptions, GuardianshipOptions } from "./rel";

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
  RelationType,
} from "./types";

export type { FamilyIndex, FamilyNeighborhood, FamilyRelative } from "./family-index";
export { collectFamilyNeighborhood, createFamilyIndex } from "./family-index";

export type {
  BuildFamilyTreeLayoutInput,
  FamilyTreeBounds,
  FamilyTreeLayoutCard,
  FamilyTreeLayoutEdge,
  FamilyTreeLayoutResult,
} from "./layout";
export { buildFamilyTreeLayout } from "./layout";

export type {
  RelationshipDirection,
  RelationshipNode,
  RelationshipEdge,
  RelationshipConnection,
  RelationshipIndex,
  TraverseRelationshipOptions,
  RelationshipLevel,
} from "./relationships";
export {
  createRelationshipIndex,
  getUpstream,
  getDownstream,
  getSpouses,
  getFormerSpouses,
  getSiblings,
  getManagers,
  getReports,
  getPeers,
  getCeoChain,
} from "./relationships";

export type {
  RelationshipGraphDomain,
  RelationshipLinePattern,
  RelationshipLinePlacement,
  RelationshipTableRow,
  RelationshipGraphFromRowsResult,
  RelationshipDisplaySemantics,
} from "./adapters";
export {
  buildRelationshipGraphFromRows,
  buildRelationshipChartInputFromRows,
  inferRelationshipChartMode,
  inferRelationshipRootId,
  getRelationshipDisplaySemantics,
} from "./adapters";
