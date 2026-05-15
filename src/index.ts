/**
 * Public entrypoint for the Family Tree UI package.
 * Re-exports core types, design presets, and React components.
 */

// Types
export type {
  FamilyMember,
  FamilyMemberStatus,
  AddMemberData,
  RelationType,
  FamilyRelationshipType,
  ProfileSearchResult,
  AddMemberPayload,
  FamilyTreeCardConfig,
  FamilyTreeCardField,
  FamilyTreeConnectorConfig,
  FamilyTreeConnectorOverrides,
  FamilyTreeLayoutDensity,
  FamilyTreeLayoutStrategy,
  FamilyTreePresetName,
  FamilyTreeRenderNodeOptions,
} from "./types";
export { familyTreePresets, getFamilyTreeConfig } from "./design-presets";
export { mapToFamilyRelationType } from "./types";
export type {
  FamilyTreeSchemaVersion,
  FamilyTreeTreeSchema,
  FamilyTreeLayoutSchema,
  FamilyTreeConnectorsSchema,
  FamilyTreeEditingSchema,
  FamilyTreeSchema,
  ResolveFamilyTreeSchemaRuntime,
  FamilyTreeResolvedConfig,
} from "./schema";
export { FamilyTreeSchemaError, parseFamilyTreeYaml, resolveFamilyTreeSchema, validateFamilyTreeSchema } from "./schema";
export type {
  FamilyTreeNodeRole,
  FamilyTreeLayoutItem,
  FamilyTreeLayoutRow,
  FamilyTreeLayoutModel,
  BuildFamilyTreeLayoutOptions,
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
export type {
  RelationshipGraphDomain,
  RelationshipLinePattern,
  RelationshipLinePlacement,
  RelationshipTableRow,
  RelationshipGraphFromRowsResult,
  RelationshipDisplaySemantics,
} from "./adapters";
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
  familyMemberToRelationshipNodes,
} from "./relationships";
export {
  buildRelationshipGraphFromRows,
  buildFamilyMemberFromRelationshipRows,
  buildRelationshipChartInputFromRows,
  inferRelationshipChartMode,
  inferRelationshipRootId,
  getRelationshipDisplaySemantics,
} from "./adapters";

// Components
export type { FamilyTreeProps } from "./components/family-tree";
export type { FamilyNodeCardProps } from "./components/node-card";
export type {
  RelationshipChartMode,
  RelationshipChartRenderNodeOptions,
  RelationshipChartLevel,
  RelationshipChartProps,
} from "./components/relationship-chart";
export { FamilyTree } from "./components/family-tree";
export { FamilyNodeCard } from "./components/node-card";
export { AddMemberDialog } from "./components/add-member-dialog";
export { RelationshipChart, buildRelationshipChartLevels } from "./components/relationship-chart";
