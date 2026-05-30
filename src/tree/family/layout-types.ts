import type { TreeBounds, TreeCardSize, TreeLayoutCardBase, TreeLayoutEdge } from "../core";
import type {
  ComputedRelation,
  FamilyNeighborhoodLimits,
  FamilyPlacementMetadata,
  FamilyRelationship,
  FamilyGraph,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
  TreeLineShape,
} from "./types";

export interface FamilyTreeLayoutCard<Person> extends TreeLayoutCardBase<Person> {
  relation: ComputedRelation;
  placement?: FamilyPlacementMetadata;
}

export type FamilyTreeLayoutEdge = TreeLayoutEdge;

export type FamilyTreeBounds = TreeBounds;

export interface FamilyTreeLayoutResult<Person> {
  cards: FamilyTreeLayoutCard<Person>[];
  edges: FamilyTreeLayoutEdge[];
  bounds: FamilyTreeBounds;
}

export interface BuildFamilyTreeLayoutInput<Person> {
  subject: PersonId;
  people: PeopleById<Person>;
  relationships?: FamilyRelationship[];
  graph?: FamilyGraph<Person>;
  collapsed?: PersonId[];
  measurements?: Record<PersonId, TreeCardSize>;
  spacing?: Partial<FamilyTreeSpacing>;
  limits?: Partial<FamilyNeighborhoodLimits>;
  lineShape?: TreeLineShape;
}
