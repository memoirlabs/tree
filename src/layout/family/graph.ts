import type { FamilyLayoutWarning, FamilyParentLink, PersonId, UnionId } from "./types";
import type { NormalizedFamilyLayoutInput, NormalizedFamilyPerson, NormalizedFamilyUnion } from "./normalize";

export interface InternalFamilyGraph<Person = unknown> {
  people: Map<PersonId, NormalizedFamilyPerson<Person>>;
  unions: Map<UnionId, NormalizedFamilyUnion>;
  parentLinks: FamilyParentLink[];
  unionsByPartner: Map<PersonId, UnionId[]>;
  unionsByChild: Map<PersonId, UnionId[]>;
  partnersByUnion: Map<UnionId, PersonId[]>;
  childrenByUnion: Map<UnionId, PersonId[]>;
  parentLinksByChild: Map<PersonId, FamilyParentLink[]>;
  parentLinksByUnion: Map<UnionId, FamilyParentLink[]>;
  warnings: FamilyLayoutWarning[];
}

const pushMap = <Key, Value>(map: Map<Key, Value[]>, key: Key, value: Value) => {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
};

const warning = (code: FamilyLayoutWarning["code"], message: string, ids?: string[]): FamilyLayoutWarning => ({
  code,
  message,
  ids,
});

const personKey = (personId: PersonId) => `person:${personId}`;
const unionKey = (unionId: UnionId) => `union:${unionId}`;
const nodeIdFromKey = (key: string) => key.slice(key.indexOf(":") + 1);

function detectFamilyCycles(unions: Map<UnionId, NormalizedFamilyUnion>): FamilyLayoutWarning[] {
  const adjacency = new Map<string, string[]>();
  for (const union of unions.values()) {
    const unionNode = unionKey(union.id);
    for (const partner of union.partners) {
      const partnerNode = personKey(partner);
      adjacency.set(partnerNode, [...(adjacency.get(partnerNode) ?? []), unionNode]);
    }
    for (const child of union.children) {
      adjacency.set(unionNode, [...(adjacency.get(unionNode) ?? []), personKey(child)]);
    }
  }

  const state = new Map<string, "visiting" | "visited">();
  const path: string[] = [];
  const cycleKeys = new Set<string>();
  const warnings: FamilyLayoutWarning[] = [];

  const visit = (key: string) => {
    const currentState = state.get(key);
    if (currentState === "visited") return;
    if (currentState === "visiting") {
      const cycleStart = path.indexOf(key);
      const cyclePath = cycleStart >= 0 ? [...path.slice(cycleStart), key] : [...path, key];
      const ids = cyclePath.map(nodeIdFromKey);
      const stableCycleKey = Array.from(new Set(ids)).toSorted().join("|");
      if (!cycleKeys.has(stableCycleKey)) {
        cycleKeys.add(stableCycleKey);
        warnings.push(warning("cycle-detected", `Cycle detected in family graph: ${ids.join(" -> ")}.`, ids));
      }
      return;
    }

    state.set(key, "visiting");
    path.push(key);
    for (const next of adjacency.get(key) ?? []) visit(next);
    path.pop();
    state.set(key, "visited");
  };

  for (const key of adjacency.keys()) visit(key);
  return warnings;
}

export function buildFamilyLayoutGraph<Person>(
  normalized: NormalizedFamilyLayoutInput<Person>,
): InternalFamilyGraph<Person> {
  const unionsByPartner = new Map<PersonId, UnionId[]>();
  const unionsByChild = new Map<PersonId, UnionId[]>();
  const partnersByUnion = new Map<UnionId, PersonId[]>();
  const childrenByUnion = new Map<UnionId, PersonId[]>();
  const parentLinksByChild = new Map<PersonId, FamilyParentLink[]>();
  const parentLinksByUnion = new Map<UnionId, FamilyParentLink[]>();

  for (const personId of normalized.people.keys()) {
    unionsByPartner.set(personId, []);
    unionsByChild.set(personId, []);
  }

  for (const union of normalized.unions.values()) {
    partnersByUnion.set(union.id, [...union.partners]);
    childrenByUnion.set(union.id, [...union.children]);
    for (const partner of union.partners) pushMap(unionsByPartner, partner, union.id);
    for (const child of union.children) pushMap(unionsByChild, child, union.id);
  }

  for (const link of normalized.parentLinks) {
    pushMap(parentLinksByChild, link.child, link);
    if (link.union) pushMap(parentLinksByUnion, link.union, link);
  }

  return {
    people: normalized.people,
    unions: normalized.unions,
    parentLinks: normalized.parentLinks,
    unionsByPartner,
    unionsByChild,
    partnersByUnion,
    childrenByUnion,
    parentLinksByChild,
    parentLinksByUnion,
    warnings: [...normalized.warnings, ...detectFamilyCycles(normalized.unions)],
  };
}
