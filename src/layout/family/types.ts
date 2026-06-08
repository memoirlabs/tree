export type PersonId = string;
export type UnionId = string;
export type FamilyNodeId = PersonId | UnionId;

export type PeopleById<Person = unknown> = Record<PersonId, Person>;

export type FamilyUnionKind = "marriage" | "partnership" | "coparent" | "unknown";
export type FamilyUnionStatus = "current" | "former" | "divorced" | "separated" | "unknown";
export type FamilyParentLinkKind = "biological" | "adoptive" | "step" | "foster" | "guardian" | "unknown";

export interface FamilyUnion {
  id: UnionId;
  partners: PersonId[];
  children?: PersonId[];
  kind?: FamilyUnionKind;
  status?: FamilyUnionStatus;
  order?: number;
}

export interface FamilyParentLink {
  parent: PersonId;
  child: PersonId;
  union?: UnionId;
  kind?: FamilyParentLinkKind;
  order?: number;
}

export interface FamilyLayoutOptions {
  mode: "full" | "neighborhood";
  direction: "top-down" | "left-right";
  centerMode: "node" | "union" | "descendant-block";
  maxAncestors: number | null;
  maxDescendants: number | null;
  maxSideBranches: number | null;
  personSize: {
    width: number;
    height: number;
  };
  unionSize: {
    width: number;
    height: number;
  };
  spacing: {
    rank: number;
    person: number;
    sibling: number;
    union: number;
    partner: number;
    component: number;
    padding: number;
  };
  unknownPerson: {
    enabled: boolean;
    label: string;
  };
  debug?: boolean;
}

export interface FamilyLayoutInput<Person = unknown> {
  people: PeopleById<Person>;
  unions?: FamilyUnion[];
  parentLinks?: FamilyParentLink[];
  root?: FamilyNodeId;
  center?: FamilyNodeId;
  options?: PartialFamilyLayoutOptions;
}

export type PartialFamilyLayoutOptions = Partial<
  Omit<FamilyLayoutOptions, "personSize" | "unionSize" | "spacing" | "unknownPerson">
> & {
  personSize?: Partial<FamilyLayoutOptions["personSize"]>;
  unionSize?: Partial<FamilyLayoutOptions["unionSize"]>;
  spacing?: Partial<FamilyLayoutOptions["spacing"]>;
  unknownPerson?: Partial<FamilyLayoutOptions["unknownPerson"]>;
};

export interface FamilyPersonLayoutNode<Person = unknown> {
  kind: "person";
  id: PersonId;
  data: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  rank: number;
  order: number;
  unions: UnionId[];
  parentUnions: UnionId[];
  childUnions: UnionId[];
  synthetic?: boolean;
  hidden?: boolean;
}

export interface FamilyUnionLayoutNode {
  kind: "union";
  id: UnionId;
  x: number;
  y: number;
  width: number;
  height: number;
  rank: number;
  order: number;
  partners: PersonId[];
  children: PersonId[];
  kindLabel?: FamilyUnionKind;
  status?: FamilyUnionStatus;
  synthetic?: boolean;
  hidden: boolean;
}

export type FamilyLayoutNode<Person = unknown> = FamilyPersonLayoutNode<Person> | FamilyUnionLayoutNode;

export interface FamilyLayoutPoint {
  x: number;
  y: number;
}

export interface FamilyLayoutEdge {
  id: string;
  kind: "partner-union" | "union-child" | "parent-child" | "guardian" | "diagnostic";
  from: FamilyNodeId;
  to: FamilyNodeId;
  points: FamilyLayoutPoint[];
  path: string;
  relation?: FamilyParentLinkKind | "mixed";
  status?: FamilyUnionStatus;
  synthetic?: boolean;
}

export interface FamilyLayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type FamilyLayoutWarningCode =
  | "missing-person"
  | "duplicate-person"
  | "duplicate-union"
  | "missing-union"
  | "synthetic-union-created"
  | "synthetic-person-created"
  | "cycle-detected"
  | "cycle-edge-hidden"
  | "disconnected-component"
  | "duplicate-child-in-union"
  | "duplicate-parent-link"
  | "invalid-parent-link"
  | "rank-conflict";

export interface FamilyLayoutWarning {
  code: FamilyLayoutWarningCode;
  message: string;
  ids?: string[];
}

export interface FamilyLayoutResult<Person = unknown> {
  nodes: FamilyLayoutNode<Person>[];
  people: FamilyPersonLayoutNode<Person>[];
  unions: FamilyUnionLayoutNode[];
  edges: FamilyLayoutEdge[];
  bounds: FamilyLayoutBounds;
  warnings: FamilyLayoutWarning[];
}

export const defaultFamilyLayoutOptions: FamilyLayoutOptions = {
  mode: "full",
  direction: "top-down",
  centerMode: "node",
  maxAncestors: null,
  maxDescendants: null,
  maxSideBranches: null,
  personSize: {
    width: 220,
    height: 80,
  },
  unionSize: {
    width: 18,
    height: 18,
  },
  spacing: {
    rank: 96,
    person: 28,
    sibling: 32,
    union: 44,
    partner: 20,
    component: 140,
    padding: 48,
  },
  unknownPerson: {
    enabled: true,
    label: "Unknown",
  },
};

export function resolveFamilyLayoutOptions(options?: PartialFamilyLayoutOptions): FamilyLayoutOptions {
  return {
    ...defaultFamilyLayoutOptions,
    ...options,
    personSize: {
      ...defaultFamilyLayoutOptions.personSize,
      ...options?.personSize,
    },
    unionSize: {
      ...defaultFamilyLayoutOptions.unionSize,
      ...options?.unionSize,
    },
    spacing: {
      ...defaultFamilyLayoutOptions.spacing,
      ...options?.spacing,
    },
    unknownPerson: {
      ...defaultFamilyLayoutOptions.unknownPerson,
      ...options?.unknownPerson,
    },
  };
}
