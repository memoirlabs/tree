import type { ComponentType, CSSProperties, HTMLAttributes, Ref } from "react";
import type {
  PeopleById,
  PersonId,
  TreeApi,
  TreeInitialViewport,
  TreeCardSize,
  TreeInteractionMode,
  TreeLineShape,
  TreePersonHandler,
  TreeStylePreset,
  TreeViewport,
} from "../core";

export type {
  PeopleById,
  PersonId,
  TreeApi,
  TreeInitialViewport,
  TreeInteractionMode,
  TreeLineShape,
  TreePort,
  TreeStylePreset,
  TreeViewport,
} from "../core";

export type ParentageRelation = "biological" | "adoptive" | "step" | "foster" | "unknown";
export type PartnershipRelation = "spouse" | "partner" | "coparent" | "unknown";
export type GuardianshipRelation = "guardian" | "foster" | "unknown";
export type FamilyRelationshipStatus = "current" | "former" | "divorced" | "separated" | "unknown";

export interface FamilyGraphPerson<Person = unknown> {
  id: PersonId;
  person: Person;
}

export interface FamilyPartnershipGroup {
  id: string;
  partners: PersonId[];
  relation?: PartnershipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
  data?: unknown;
}

export interface FamilyParentChildLink {
  id?: string;
  groupId?: string;
  parentId: PersonId;
  childId: PersonId;
  relation?: ParentageRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface FamilyGuardianshipLink {
  id?: string;
  groupId?: string;
  guardianId: PersonId;
  childId: PersonId;
  relation?: GuardianshipRelation;
  status?: Extract<FamilyRelationshipStatus, "current" | "former" | "unknown">;
  order?: number;
}

export interface FamilyGraph<Person = unknown> {
  people: PeopleById<Person>;
  subject: PersonId;
  partnershipGroups: FamilyPartnershipGroup[];
  parentChildLinks: FamilyParentChildLink[];
  guardianshipLinks?: FamilyGuardianshipLink[];
}

export interface FamilyPlacementMetadata {
  partnershipGroupIds: string[];
  parentChildLinkIds: string[];
  guardianshipLinkIds: string[];
  visibleRelationshipIds: string[];
}

export interface FamilyParentageRelationship {
  id?: string;
  type: "parentage";
  parents: PersonId[];
  children: PersonId[];
  groupId?: string;
  parentChildLinkIds?: string[];
  relation?: ParentageRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface FamilyPartnershipRelationship {
  id?: string;
  type: "partnership";
  partners: PersonId[];
  groupId?: string;
  relation?: PartnershipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface FamilyGuardianshipRelationship {
  id?: string;
  type: "guardianship";
  guardians: PersonId[];
  children: PersonId[];
  groupId?: string;
  guardianshipLinkIds?: string[];
  relation?: GuardianshipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export type FamilyRelationship =
  | FamilyParentageRelationship
  | FamilyPartnershipRelationship
  | FamilyGuardianshipRelationship;

export type ComputedRelationLabel =
  | "self"
  | "parent"
  | "grandparent"
  | "ancestor"
  | "aunt-uncle"
  | "child"
  | "grandchild"
  | "descendant"
  | "sibling"
  | "half-sibling"
  | "cousin"
  | "niece-nephew"
  | "partner"
  | "partner-parent"
  | "coparent"
  | "guardian"
  | "relative"
  | "unknown";

export type ComputedRelationSide = "self" | "ancestor" | "descendant" | "sibling" | "partner" | "other";

export interface ComputedRelation {
  label: ComputedRelationLabel;
  generation: number;
  side: ComputedRelationSide;
}

export interface FamilyNeighborhoodLimits {
  ancestorGenerations: number | null;
  descendantGenerations: number | null;
  lateralFamilyGenerations: number | null;
  grandparents: number | null;
  parents: number | null;
  siblings: number | null;
  halfSiblings: number | null;
  auntsUncles: number | null;
  cousins: number | null;
  niecesNephews: number | null;
  partners: number | null;
  children: number | null;
  grandchildren: number | null;
}

export interface FamilyCardProps<Person> extends HTMLAttributes<HTMLElement> {
  person: Person;
  personId: PersonId;
  relation: ComputedRelation;
  selected: boolean;
  focused: boolean;
  collapsed: boolean;
  readOnly: boolean;
  placement?: FamilyPlacementMetadata;
  onAddRelationship?: FamilyTreePersonHandler<Person>;
  className?: string;
  style?: CSSProperties;
  "data-family-card"?: string;
  "data-tree-card"?: string;
  "data-focused"?: string;
  "data-person-id"?: string;
  "data-relation"?: ComputedRelationLabel;
  "data-generation"?: number;
  "data-selected"?: string;
  "data-side"?: ComputedRelationSide;
}

export type FamilyTreeSize = TreeCardSize;

export type FamilyTreePersonHandler<Person> = TreePersonHandler<Person>;

export type FamilyTreeLayoutMode = "default" | "compact-family";
export type FamilyTreeBoundsMode = "subject" | "content";

export interface FamilyTreeLayoutPolicy {
  descendantCoparents?: "omit" | "include";
  subjectPartnerPlacement?: "balanced" | "after-subject";
}

export type FamilyTreeRenderCardPredicate<Person> = (person: Person, personId: PersonId) => boolean;

export type FamilyTreeCardProps<Person, CardExtraProps extends object> =
  | CardExtraProps
  | ((person: Person, props: FamilyCardProps<Person>) => CardExtraProps);

export interface FamilyTreeProps<Person, CardExtraProps extends object = Record<string, never>> {
  subject?: PersonId;
  people?: PeopleById<Person>;
  relationships?: FamilyRelationship[];
  graph?: FamilyGraph<Person>;
  ariaLabel?: string;
  card?: ComponentType<FamilyCardProps<Person> & CardExtraProps>;
  cardProps?: FamilyTreeCardProps<Person, CardExtraProps>;
  className?: string;
  style?: CSSProperties;
  cardClassName?: string;
  edgeClassName?: string;
  interactionMode?: TreeInteractionMode;
  lineShape?: TreeLineShape;
  viewport?: TreeViewport;
  defaultViewport?: Partial<TreeViewport>;
  initialViewport?: TreeInitialViewport;
  onViewportChange?: (viewport: TreeViewport) => void;
  spacing?: Partial<FamilyTreeSpacing>;
  estimatedCardSize?: Partial<FamilyTreeSize>;
  layoutMode?: FamilyTreeLayoutMode;
  layoutPolicy?: FamilyTreeLayoutPolicy;
  boundsMode?: FamilyTreeBoundsMode;
  shouldRenderPersonCard?: FamilyTreeRenderCardPredicate<Person>;
  limits?: Partial<FamilyNeighborhoodLimits>;
  theme?: TreeStylePreset;
  treeApiRef?: Ref<TreeApi>;
  getPersonLabel?: (person: Person, personId: PersonId) => string;
  selected?: PersonId;
  collapsed?: PersonId[];
  readOnly?: boolean;
  onPersonClick?: FamilyTreePersonHandler<Person>;
  onAddRelationship?: FamilyTreePersonHandler<Person>;
}

export interface FamilyTreeSpacing {
  row: number;
  column: number;
  padding: number;
}
