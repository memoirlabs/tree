import type { ComponentType, CSSProperties, HTMLAttributes } from "react";

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

export interface FamilyCardProps<Person> extends HTMLAttributes<HTMLElement> {
  person: Person;
  personId: PersonId;
  relation: ComputedRelation;
  selected: boolean;
  focused: boolean;
  collapsed: boolean;
  className?: string;
  style?: CSSProperties;
  "data-family-card"?: string;
  "data-tree-card"?: string;
  "data-person-id"?: string;
  "data-relation"?: ComputedRelationLabel;
  "data-generation"?: number;
  "data-side"?: ComputedRelationSide;
}

export interface FamilyTreeSize {
  width: number;
  height: number;
}

export type TreeInteractionMode = "pan" | "scroll" | "none";

export interface FamilyTreeProps<Person> {
  subject: PersonId;
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
  card?: ComponentType<FamilyCardProps<Person>>;
  className?: string;
  style?: CSSProperties;
  cardClassName?: string;
  edgeClassName?: string;
  interactionMode?: TreeInteractionMode;
  selected?: PersonId;
  collapsed?: PersonId[];
  onPersonClick?: (person: Person, personId: PersonId) => void;
}

export interface FamilyTreeSpacing {
  row: number;
  column: number;
  padding: number;
}

export interface OrgChartNode<Person> {
  id: PersonId;
  person: Person;
  parentId?: PersonId | null;
  order?: number;
}

export interface OrgChartCardProps<Person> extends HTMLAttributes<HTMLElement> {
  person: Person;
  personId: PersonId;
  managerId?: PersonId;
  depth: number;
  selected: boolean;
  focused: boolean;
  collapsed: boolean;
  directReports: PersonId[];
  className?: string;
  style?: CSSProperties;
  "data-org-card"?: string;
  "data-tree-card"?: string;
  "data-person-id"?: string;
  "data-depth"?: number;
}

export interface OrgChartProps<Person> {
  nodes: OrgChartNode<Person>[];
  rootId?: PersonId;
  card?: ComponentType<OrgChartCardProps<Person>>;
  className?: string;
  style?: CSSProperties;
  cardClassName?: string;
  edgeClassName?: string;
  interactionMode?: TreeInteractionMode;
  selected?: PersonId;
  collapsed?: PersonId[];
  onPersonClick?: (person: Person, personId: PersonId) => void;
}
