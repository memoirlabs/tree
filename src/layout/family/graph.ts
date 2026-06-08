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
    warnings: normalized.warnings,
  };
}
