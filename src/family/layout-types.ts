import type {
  ComputedRelation,
  FamilyNeighborhoodLimits,
  FamilyRelationship,
  FamilyTreeSize,
  FamilyTreeSpacing,
  PeopleById,
  PersonId,
} from "./types";
import type { TreeLineShape } from "./theme";

export interface FamilyTreeLayoutCard<Person> {
  personId: PersonId;
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  relation: ComputedRelation;
}

export interface FamilyTreeLayoutEdge {
  id: string;
  path: string;
  kind: string;
  status?: string;
  sourceId?: PersonId;
  targetId?: PersonId;
}

export interface FamilyTreeBounds {
  width: number;
  height: number;
}

export interface FamilyTreeLayoutResult<Person> {
  cards: FamilyTreeLayoutCard<Person>[];
  edges: FamilyTreeLayoutEdge[];
  bounds: FamilyTreeBounds;
}

export interface BuildFamilyTreeLayoutInput<Person> {
  subject: PersonId;
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
  collapsed?: PersonId[];
  measurements?: Record<PersonId, FamilyTreeSize>;
  spacing?: Partial<FamilyTreeSpacing>;
  limits?: Partial<FamilyNeighborhoodLimits>;
  lineShape?: TreeLineShape;
}
