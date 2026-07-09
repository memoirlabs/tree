import type { TreeBounds, TreeCardSize, TreeLayoutCardBase, TreeLayoutEdge } from "../core";
import type {
  ComputedRelation,
  FamilyNeighborhoodLimits,
  FamilyPersonMetadata,
  FamilyPlacementMetadata,
  FamilyRelationship,
  FamilyGraph,
  FamilyTreeLayoutMode,
  FamilyTreeLayoutPolicy,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
  TreeLineShape,
} from "./types";

export interface FamilyTreeLayoutCard<Person> extends TreeLayoutCardBase<Person> {
  relation: ComputedRelation;
  metadata?: FamilyPersonMetadata;
  placement?: FamilyPlacementMetadata;
  hiddenCard?: boolean;
}

export type FamilyTreeLayoutEdge = TreeLayoutEdge;

export type FamilyTreeBounds = TreeBounds;

export type FamilyTreeBoundsMode = "subject" | "content";

export interface FamilyTreeContentBounds extends FamilyTreeBounds {
  x: number;
  y: number;
}

export interface FamilyTreeLayoutResult<Person> {
  cards: FamilyTreeLayoutCard<Person>[];
  edges: FamilyTreeLayoutEdge[];
  bounds: FamilyTreeBounds;
  contentBounds: FamilyTreeContentBounds;
}

export interface BuildFamilyTreeLayoutInput<Person> {
  subject?: PersonId;
  people?: PeopleById<Person>;
  relationships?: FamilyRelationship[];
  graph?: FamilyGraph<Person>;
  collapsed?: PersonId[];
  measurements?: Record<PersonId, TreeCardSize>;
  estimatedCardSize?: Partial<TreeCardSize>;
  spacing?: Partial<FamilyTreeSpacing>;
  layoutMode?: FamilyTreeLayoutMode;
  layoutPolicy?: FamilyTreeLayoutPolicy;
  boundsMode?: FamilyTreeBoundsMode;
  shouldRenderPersonCard?: (person: Person, personId: PersonId) => boolean;
  limits?: Partial<FamilyNeighborhoodLimits>;
  lineShape?: TreeLineShape;
}
