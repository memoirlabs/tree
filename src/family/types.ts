import type { ComponentType, CSSProperties, HTMLAttributes, JSX, Ref } from "react";
import type { TreeLineShape, TreeStylePreset, TreeTheme } from "./theme";

export type PersonId = string;

export type PeopleById<Person> = Record<PersonId, Person>;

export type ParentageRelation = "biological" | "adoptive" | "step" | "foster" | "unknown";
export type PartnershipRelation = "spouse" | "partner" | "coparent" | "unknown";
export type GuardianshipRelation = "guardian" | "foster" | "unknown";
export type FamilyRelationshipStatus = "current" | "former" | "divorced" | "separated" | "unknown";

export interface FamilyParentageRelationship {
  id?: string;
  type: "parentage";
  parents: PersonId[];
  children: PersonId[];
  relation?: ParentageRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface FamilyPartnershipRelationship {
  id?: string;
  type: "partnership";
  partners: PersonId[];
  relation?: PartnershipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface FamilyGuardianshipRelationship {
  id?: string;
  type: "guardianship";
  guardians: PersonId[];
  children: PersonId[];
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
  | "great-grandparent"
  | "child"
  | "grandchild"
  | "great-grandchild"
  | "sibling"
  | "half-sibling"
  | "partner"
  | "coparent"
  | "guardian"
  | "unknown";

export type ComputedRelationSide = "self" | "ancestor" | "descendant" | "sibling" | "partner" | "other";

export interface ComputedRelation {
  label: ComputedRelationLabel;
  generation: number;
  side: ComputedRelationSide;
}

export interface FamilyNeighborhoodLimits {
  grandparents: number | null;
  parents: number | null;
  siblings: number | null;
  halfSiblings: number | null;
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

export interface FamilyTreeSize {
  width: number;
  height: number;
}

export type TreeInteractionMode = "pan" | "scroll" | "none";

export interface TreeViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface TreeApi {
  centerPerson: (personId: PersonId) => void;
  fitToSubject: () => void;
  resetViewport: () => void;
  zoomTo: (zoom: number) => void;
}

export type RenderProfileCard<Person> = (profile: Person, props: FamilyCardProps<Person>) => JSX.Element;

export type FamilyTreePersonHandler<Person> = (person: Person, personId: PersonId) => void;

export type FamilyTreeCardProps<Person, CardExtraProps extends object> =
  | CardExtraProps
  | ((person: Person, props: FamilyCardProps<Person>) => CardExtraProps);

export interface FamilyTreeProps<Person, CardExtraProps extends object = Record<string, never>> {
  subject?: PersonId;
  rootProfileId?: PersonId;
  people?: PeopleById<Person>;
  profiles?: PeopleById<Person>;
  relationships: FamilyRelationship[];
  ariaLabel?: string;
  card?: ComponentType<FamilyCardProps<Person> & CardExtraProps>;
  cardProps?: FamilyTreeCardProps<Person, CardExtraProps>;
  renderProfileCard?: RenderProfileCard<Person>;
  className?: string;
  style?: CSSProperties;
  cardClassName?: string;
  edgeClassName?: string;
  interactionMode?: TreeInteractionMode;
  lineShape?: TreeLineShape;
  zoom?: number;
  defaultZoom?: number;
  viewport?: TreeViewport;
  defaultViewport?: Partial<TreeViewport>;
  onViewportChange?: (viewport: TreeViewport) => void;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
  spacing?: Partial<FamilyTreeSpacing>;
  limits?: Partial<FamilyNeighborhoodLimits>;
  theme?: TreeStylePreset | TreeTheme;
  treeApiRef?: Ref<TreeApi>;
  getPersonLabel?: (person: Person, personId: PersonId) => string;
  selected?: PersonId;
  collapsed?: PersonId[];
  readOnly?: boolean;
  onPersonClick?: FamilyTreePersonHandler<Person>;
  onSelectProfile?: FamilyTreePersonHandler<Person>;
  onAddRelationship?: FamilyTreePersonHandler<Person>;
}

export interface FamilyTreeSpacing {
  row: number;
  column: number;
  padding: number;
}

export type { TreeLineShape, TreeStylePreset, TreeTheme };
