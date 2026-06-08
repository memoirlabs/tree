import { buildFamilyTreeLayout } from "./family-layout";
import type {
  FamilyGraph,
  FamilyGuardianshipLink,
  FamilyParentChildLink,
  FamilyPartnershipGroup,
  FamilyRelationshipStatus,
  GuardianshipRelation,
  ParentageRelation,
  PartnershipRelation,
  PeopleById,
  PersonId,
} from "./types";

export type UnionId = string;
export type FamilyNodeId = PersonId | UnionId;

export type FamilyUnionKind = "marriage" | "partnership" | "coparent" | "unknown";
export type FamilyUnionStatus = FamilyRelationshipStatus;
export type FamilyParentLinkKind = ParentageRelation | GuardianshipRelation;

export interface FamilyUnion<UnionData = unknown> {
  id: UnionId;
  partners: PersonId[];
  children?: PersonId[];
  kind?: FamilyUnionKind;
  status?: FamilyUnionStatus;
  order?: number;
  data?: UnionData;
}

export interface FamilyParentLink {
  parent: PersonId;
  child: PersonId;
  union?: UnionId;
  kind?: FamilyParentLinkKind;
  order?: number;
}

export interface CreateUnionParentLinksOptions {
  kind?: FamilyParentLinkKind | Partial<Record<PersonId, FamilyParentLinkKind>>;
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

export type PartialFamilyLayoutOptions = Partial<
  Omit<FamilyLayoutOptions, "personSize" | "unionSize" | "spacing" | "unknownPerson">
> & {
  personSize?: Partial<FamilyLayoutOptions["personSize"]>;
  unionSize?: Partial<FamilyLayoutOptions["unionSize"]>;
  spacing?: Partial<FamilyLayoutOptions["spacing"]>;
  unknownPerson?: Partial<FamilyLayoutOptions["unknownPerson"]>;
};

export interface FamilyLayoutInput<Person = unknown, UnionData = unknown> {
  people: PeopleById<Person>;
  unions?: Array<FamilyUnion<UnionData>>;
  parentLinks?: FamilyParentLink[];
  root?: FamilyNodeId;
  center?: FamilyNodeId;
  options?: PartialFamilyLayoutOptions;
}

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

export interface FamilyUnionLayoutNode<UnionData = unknown> {
  kind: "union";
  id: UnionId;
  data?: UnionData;
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

export type FamilyLayoutNode<Person = unknown, UnionData = unknown> =
  | FamilyPersonLayoutNode<Person>
  | FamilyUnionLayoutNode<UnionData>;

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

export interface FamilyLayoutResult<Person = unknown, UnionData = unknown> {
  nodes: Array<FamilyLayoutNode<Person, UnionData>>;
  people: FamilyPersonLayoutNode<Person>[];
  unions: Array<FamilyUnionLayoutNode<UnionData>>;
  edges: FamilyLayoutEdge[];
  bounds: FamilyLayoutBounds;
  warnings: FamilyLayoutWarning[];
  graph: FamilyGraph<Person>;
}

export interface NormalizedFamilyPerson<Person = unknown> {
  id: PersonId;
  data: Person;
  synthetic: boolean;
  hidden: boolean;
}

export interface NormalizedFamilyUnion<UnionData = unknown> {
  id: UnionId;
  partners: PersonId[];
  children: PersonId[];
  kind?: FamilyUnionKind;
  status?: FamilyUnionStatus;
  order: number;
  data?: UnionData;
  synthetic: boolean;
}

export interface NormalizedFamilyLayoutInput<Person = unknown, UnionData = unknown> {
  people: Map<PersonId, NormalizedFamilyPerson<Person>>;
  unions: Map<UnionId, NormalizedFamilyUnion<UnionData>>;
  parentLinks: FamilyParentLink[];
  center?: FamilyNodeId;
  root?: FamilyNodeId;
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

const warning = (code: FamilyLayoutWarningCode, message: string, ids?: string[]): FamilyLayoutWarning => ({
  code,
  message,
  ids,
});

const unique = <Value>(values: Value[]) => Array.from(new Set(values));

const syntheticUnionId = (parents: PersonId[]) => `u:${parents.toSorted().join("+")}`;

export function createUnionParentLinks(
  union: Pick<FamilyUnion, "id" | "partners">,
  child: PersonId,
  options: CreateUnionParentLinksOptions = {},
): FamilyParentLink[] {
  return unique(union.partners).map((parent) => ({
    parent,
    child,
    union: union.id,
    kind: typeof options.kind === "string" ? options.kind : options.kind?.[parent],
    order: options.order,
  }));
}

const unionKindToPartnershipRelation = (kind?: FamilyUnionKind): PartnershipRelation => {
  if (kind === "marriage") return "spouse";
  if (kind === "coparent") return "coparent";
  if (kind === "unknown") return "unknown";
  return "partner";
};

const parentLinkKindToParentageRelation = (kind?: FamilyParentLinkKind): ParentageRelation => {
  if (kind === "adoptive" || kind === "step" || kind === "foster" || kind === "unknown") return kind;
  return "biological";
};

const parentLinkKindToGuardianshipRelation = (kind?: FamilyParentLinkKind): GuardianshipRelation => {
  if (kind === "foster" || kind === "unknown") return kind;
  return "guardian";
};

const isGuardianLink = (link: FamilyParentLink) => link.kind === "guardian";

function createSyntheticPerson<Person>(id: PersonId, options: FamilyLayoutOptions): NormalizedFamilyPerson<Person> {
  return {
    id,
    data: { label: options.unknownPerson.label } as Person,
    synthetic: true,
    hidden: !options.unknownPerson.enabled,
  };
}

function ensurePerson<Person>(
  people: Map<PersonId, NormalizedFamilyPerson<Person>>,
  id: PersonId,
  options: FamilyLayoutOptions,
  warnings: FamilyLayoutWarning[],
) {
  if (people.has(id)) return;
  people.set(id, createSyntheticPerson(id, options));
  warnings.push(warning("synthetic-person-created", `Created synthetic person for missing id ${id}.`, [id]));
}

function addUnionChild<UnionData>(
  union: NormalizedFamilyUnion<UnionData>,
  child: PersonId,
  warnings: FamilyLayoutWarning[],
) {
  if (union.children.includes(child)) {
    warnings.push(warning("duplicate-child-in-union", `Duplicate child ${child} in union ${union.id}.`, [union.id, child]));
    return;
  }
  union.children.push(child);
}

function normalizeFamilyLayoutInput<Person, UnionData>(
  input: FamilyLayoutInput<Person, UnionData>,
  options: FamilyLayoutOptions,
): NormalizedFamilyLayoutInput<Person, UnionData> {
  if (!input.people || typeof input.people !== "object") {
    throw new Error("layoutFamilyTree requires a people object.");
  }

  const warnings: FamilyLayoutWarning[] = [];
  const people = new Map<PersonId, NormalizedFamilyPerson<Person>>();
  const unions = new Map<UnionId, NormalizedFamilyUnion<UnionData>>();
  const parentLinks: FamilyParentLink[] = [];

  for (const [id, data] of Object.entries(input.people) as Array<[PersonId, Person]>) {
    people.set(id, { id, data, synthetic: false, hidden: false });
  }

  for (const union of input.unions ?? []) {
    if (unions.has(union.id)) {
      warnings.push(warning("duplicate-union", `Duplicate union id ignored: ${union.id}.`, [union.id]));
      continue;
    }
    const partners = unique(union.partners);
    const children = unique(union.children ?? []);
    if ((union.children ?? []).length !== children.length) {
      warnings.push(warning("duplicate-child-in-union", `Duplicate children removed from union ${union.id}.`, [union.id]));
    }
    for (const personId of [...partners, ...children]) {
      ensurePerson(people, personId, options, warnings);
    }
    unions.set(union.id, {
      id: union.id,
      partners,
      children,
      kind: union.kind,
      status: union.status,
      order: union.order ?? Number.POSITIVE_INFINITY,
      data: union.data,
      synthetic: false,
    });
  }

  const ungroupedLinksByChild = new Map<PersonId, FamilyParentLink[]>();
  for (const link of input.parentLinks ?? []) {
    ensurePerson(people, link.parent, options, warnings);
    ensurePerson(people, link.child, options, warnings);
    if (link.union) {
      parentLinks.push(link);
      continue;
    }
    const links = ungroupedLinksByChild.get(link.child) ?? [];
    links.push(link);
    ungroupedLinksByChild.set(link.child, links);
  }

  const linksBySyntheticUnion = new Map<UnionId, FamilyParentLink[]>();
  for (const links of ungroupedLinksByChild.values()) {
    const parentageLinks = links.filter((link) => !isGuardianLink(link));
    const guardianLinks = links.filter(isGuardianLink);
    if (parentageLinks.length > 0) {
      const unionId = syntheticUnionId(parentageLinks.map((link) => link.parent));
      linksBySyntheticUnion.set(unionId, [...(linksBySyntheticUnion.get(unionId) ?? []), ...parentageLinks]);
    }
    parentLinks.push(...guardianLinks);
  }

  for (const [unionId, links] of linksBySyntheticUnion) {
    const partners = unique(links.map((link) => link.parent));
    const children = unique(links.map((link) => link.child));
    let union = unions.get(unionId);
    if (!union) {
      union = {
        id: unionId,
        partners,
        children: [],
        kind: "unknown",
        status: "unknown",
        order: Number.POSITIVE_INFINITY,
        synthetic: true,
      };
      unions.set(unionId, union);
      warnings.push(warning("synthetic-union-created", `Created synthetic union ${unionId}.`, [unionId]));
    }
    for (const partner of partners) {
      if (!union.partners.includes(partner)) union.partners.push(partner);
    }
    for (const child of children) addUnionChild(union, child, warnings);
    for (const link of links) parentLinks.push({ ...link, union: unionId });
  }

  const seenParentLinks = new Set<string>();
  const dedupedParentLinks: FamilyParentLink[] = [];
  for (const link of parentLinks) {
    if (isGuardianLink(link) && !link.union) {
      const key = `${link.parent}->${link.child}:guardian`;
      if (seenParentLinks.has(key)) {
        warnings.push(warning("duplicate-parent-link", `Duplicate parent link ignored: ${key}.`, [link.parent, link.child]));
        continue;
      }
      seenParentLinks.add(key);
      dedupedParentLinks.push(link);
      continue;
    }

    const union = link.union ? unions.get(link.union) : undefined;
    if (!union) {
      warnings.push(warning("missing-union", `Parent link references missing union ${link.union}.`, [link.union ?? ""]));
      continue;
    }
    if (!union.partners.includes(link.parent)) {
      union.partners.push(link.parent);
      warnings.push(warning("invalid-parent-link", `Added parent ${link.parent} to union ${union.id}.`, [union.id, link.parent]));
    }
    if (!union.children.includes(link.child)) union.children.push(link.child);

    const key = `${link.parent}->${link.child}@${union.id}:${link.kind ?? "unknown"}`;
    if (seenParentLinks.has(key)) {
      warnings.push(warning("duplicate-parent-link", `Duplicate parent link ignored: ${key}.`, [link.parent, link.child, union.id]));
      continue;
    }
    seenParentLinks.add(key);
    dedupedParentLinks.push({ ...link, union: union.id });
  }

  for (const union of unions.values()) {
    for (const child of union.children) {
      const hasLink = dedupedParentLinks.some((link) => link.union === union.id && link.child === child);
      if (hasLink) continue;
      for (const partner of union.partners) {
        dedupedParentLinks.push({
          parent: partner,
          child,
          union: union.id,
          kind: "unknown",
        });
      }
    }
  }

  return {
    people,
    unions,
    parentLinks: dedupedParentLinks,
    center: input.center,
    root: input.root,
    warnings,
  };
}

function selectSubject<Person, UnionData>(
  normalized: NormalizedFamilyLayoutInput<Person, UnionData>,
): PersonId | undefined {
  const requested = normalized.center ?? normalized.root;
  if (requested && normalized.people.has(requested)) return requested;
  const requestedUnion = requested ? normalized.unions.get(requested) : undefined;
  if (requestedUnion) return requestedUnion.partners[0] ?? requestedUnion.children[0];
  return normalized.people.keys().next().value;
}

function toFamilyGraph<Person, UnionData>(normalized: NormalizedFamilyLayoutInput<Person, UnionData>): FamilyGraph<Person> {
  const subject = selectSubject(normalized);
  if (!subject) {
    return {
      people: {},
      subject: "",
      partnershipGroups: [],
      parentChildLinks: [],
      guardianshipLinks: [],
    };
  }

  const people = Object.fromEntries(
    Array.from(normalized.people.values()).map((person) => [person.id, person.data]),
  ) as PeopleById<Person>;
  const partnershipGroups: FamilyPartnershipGroup[] = Array.from(normalized.unions.values()).map((union) => ({
    id: union.id,
    partners: union.partners,
    relation: unionKindToPartnershipRelation(union.kind),
    status: union.status,
    order: Number.isFinite(union.order) ? union.order : undefined,
    data: union.data,
  }));
  const parentChildLinks: FamilyParentChildLink[] = [];
  const guardianshipLinks: FamilyGuardianshipLink[] = [];

  normalized.parentLinks.forEach((link, index) => {
    if (isGuardianLink(link)) {
      guardianshipLinks.push({
        id: `guardian:${link.parent}:${link.child}:${index}`,
        groupId: link.union,
        guardianId: link.parent,
        childId: link.child,
        relation: parentLinkKindToGuardianshipRelation(link.kind),
        order: link.order,
      });
      return;
    }
    parentChildLinks.push({
      id: `parent:${link.parent}:${link.child}:${index}`,
      groupId: link.union,
      parentId: link.parent,
      childId: link.child,
      relation: parentLinkKindToParentageRelation(link.kind),
      order: link.order,
    });
  });

  return {
    people,
    subject,
    partnershipGroups,
    parentChildLinks,
    guardianshipLinks,
  };
}

const centerX = (node: { x: number; width: number }) => node.x + node.width / 2;
const centerY = (node: { y: number; height: number }) => node.y + node.height / 2;
const round = (value: number) => Math.round(value * 100) / 100;
const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;
const pointsToPath = (points: FamilyLayoutPoint[]) =>
  points.map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`).join(" ");

function createBounds<Person, UnionData>(nodes: Array<FamilyLayoutNode<Person, UnionData>>): FamilyLayoutBounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    minX: round(minX),
    minY: round(minY),
    maxX: round(maxX),
    maxY: round(maxY),
    width: round(maxX - minX),
    height: round(maxY - minY),
  };
}

function relationForUnionChild(parentLinks: FamilyParentLink[], unionId: UnionId, childId: PersonId) {
  const kinds = new Set(
    parentLinks
      .filter((link) => link.union === unionId && link.child === childId && !isGuardianLink(link))
      .map((link) => link.kind ?? "unknown"),
  );
  if (kinds.size === 0) return undefined;
  if (kinds.size === 1) return Array.from(kinds)[0];
  return "mixed";
}

export function createFamilyLayoutService(defaultOptions?: PartialFamilyLayoutOptions) {
  const serviceOptions = resolveFamilyLayoutOptions(defaultOptions);

  return {
    normalize<Person, UnionData = unknown>(input: FamilyLayoutInput<Person, UnionData>) {
      return normalizeFamilyLayoutInput(input, resolveFamilyLayoutOptions({ ...serviceOptions, ...input.options }));
    },

    toGraph<Person, UnionData = unknown>(input: FamilyLayoutInput<Person, UnionData>): FamilyGraph<Person> {
      return toFamilyGraph(this.normalize(input));
    },

    layout<Person, UnionData = unknown>(input: FamilyLayoutInput<Person, UnionData>): FamilyLayoutResult<Person, UnionData> {
      const options = resolveFamilyLayoutOptions({ ...serviceOptions, ...input.options });
      const normalized = normalizeFamilyLayoutInput(input, options);
      const graph = toFamilyGraph(normalized);
      if (!graph.subject) {
        return {
          nodes: [],
          people: [],
          unions: [],
          edges: [],
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
          warnings: normalized.warnings,
          graph,
        };
      }

      const measurements = Object.fromEntries(
        Array.from(normalized.people.values()).map((person) => [
          person.id,
          person.hidden ? { width: 0, height: 0 } : options.personSize,
        ]),
      );
      const treeLayout = buildFamilyTreeLayout({
        graph,
        measurements,
        spacing: {
          row: options.spacing.rank,
          column: options.spacing.person,
          padding: options.spacing.padding,
        },
        limits: {
          ancestorGenerations: options.maxAncestors,
          descendantGenerations: options.maxDescendants,
          lateralFamilyGenerations: options.maxSideBranches,
          grandparents: null,
          parents: null,
          siblings: null,
          halfSiblings: null,
          partners: null,
          children: null,
          grandchildren: null,
        },
      });

      const cardsById = new Map(treeLayout.cards.map((card) => [card.personId, card]));
      const unionIdsByPerson = new Map<PersonId, Set<UnionId>>();
      const parentUnionIdsByPerson = new Map<PersonId, Set<UnionId>>();
      const childUnionIdsByPerson = new Map<PersonId, Set<UnionId>>();
      for (const union of normalized.unions.values()) {
        for (const personId of [...union.partners, ...union.children]) {
          const unions = unionIdsByPerson.get(personId) ?? new Set<UnionId>();
          unions.add(union.id);
          unionIdsByPerson.set(personId, unions);
        }
        for (const child of union.children) {
          const unions = parentUnionIdsByPerson.get(child) ?? new Set<UnionId>();
          unions.add(union.id);
          parentUnionIdsByPerson.set(child, unions);
        }
        for (const partner of union.partners) {
          const unions = childUnionIdsByPerson.get(partner) ?? new Set<UnionId>();
          unions.add(union.id);
          childUnionIdsByPerson.set(partner, unions);
        }
      }

      const people = treeLayout.cards.map((card, order): FamilyPersonLayoutNode<Person> => {
        const normalizedPerson = normalized.people.get(card.personId);
        return {
          kind: "person",
          id: card.personId,
          data: card.person,
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
          rank: card.relation.generation,
          order,
          unions: Array.from(unionIdsByPerson.get(card.personId) ?? []),
          parentUnions: Array.from(parentUnionIdsByPerson.get(card.personId) ?? []),
          childUnions: Array.from(childUnionIdsByPerson.get(card.personId) ?? []),
          synthetic: normalizedPerson?.synthetic || undefined,
          hidden: normalizedPerson?.hidden || undefined,
        };
      });

      const unions = Array.from(normalized.unions.values()).flatMap((union): Array<FamilyUnionLayoutNode<UnionData>> => {
        const visiblePartners = union.partners.map((partner) => cardsById.get(partner)).filter(isDefined);
        const visibleChildren = union.children.map((child) => cardsById.get(child)).filter(isDefined);
        const visibleCards = [...visiblePartners, ...visibleChildren];
        if (visibleCards.length === 0) return [];
        const anchorCards = visiblePartners.length > 0 ? visiblePartners : visibleCards;
        const x = round(
          anchorCards.reduce((sum, card) => sum + centerX(card), 0) / anchorCards.length -
            options.unionSize.width / 2,
        );
        const partnerBottom =
          visiblePartners.length > 0
            ? Math.max(...visiblePartners.map((card) => card.y + card.height))
            : Math.min(...visibleCards.map((card) => card.y));
        const childTop =
          visibleChildren.length > 0
            ? Math.min(...visibleChildren.map((card) => card.y))
            : partnerBottom + options.spacing.union;
        const y = round(partnerBottom + (childTop - partnerBottom) / 2 - options.unionSize.height / 2);
        return [
          {
            kind: "union",
            id: union.id,
            data: union.data,
            x,
            y,
            width: options.unionSize.width,
            height: options.unionSize.height,
            rank:
              Math.round(
                (visibleCards.reduce((sum, card) => sum + card.relation.generation, 0) / visibleCards.length) * 2,
              ) / 2,
            order: union.order,
            partners: union.partners,
            children: union.children,
            kindLabel: union.kind,
            status: union.status,
            synthetic: union.synthetic || undefined,
            hidden: true,
          },
        ];
      });
      const unionById = new Map(unions.map((union) => [union.id, union]));
      const edges: FamilyLayoutEdge[] = [];

      for (const union of unions) {
        for (const partnerId of union.partners) {
          const partner = cardsById.get(partnerId);
          if (!partner) continue;
          const points = [
            { x: centerX(partner), y: partner.y + partner.height },
            { x: centerX(partner), y: centerY(union) },
            { x: centerX(union), y: centerY(union) },
          ];
          edges.push({
            id: `partner-union:${partnerId}:${union.id}`,
            kind: "partner-union",
            from: partnerId,
            to: union.id,
            points,
            path: pointsToPath(points),
            status: union.status,
            synthetic: union.synthetic,
          });
        }

        for (const childId of union.children) {
          const child = cardsById.get(childId);
          const unionNode = unionById.get(union.id);
          if (!child || !unionNode) continue;
          const startY = unionNode.y + unionNode.height;
          const endY = child.y;
          const midY = round(startY + (endY - startY) / 2);
          const points = [
            { x: centerX(unionNode), y: startY },
            { x: centerX(unionNode), y: midY },
            { x: centerX(child), y: midY },
            { x: centerX(child), y: endY },
          ];
          edges.push({
            id: `union-child:${union.id}:${childId}`,
            kind: "union-child",
            from: union.id,
            to: childId,
            points,
            path: pointsToPath(points),
            relation: relationForUnionChild(normalized.parentLinks, union.id, childId),
            status: union.status,
            synthetic: union.synthetic,
          });
        }
      }

      const nodes = [...people, ...unions].toSorted((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
      return {
        nodes,
        people,
        unions,
        edges,
        bounds: createBounds(nodes),
        warnings: normalized.warnings,
        graph,
      };
    },

    createParentLinksForUnion: createUnionParentLinks,
  };
}

export function layoutFamilyTree<Person, UnionData = unknown>(
  input: FamilyLayoutInput<Person, UnionData>,
): FamilyLayoutResult<Person, UnionData> {
  return createFamilyLayoutService().layout(input);
}
