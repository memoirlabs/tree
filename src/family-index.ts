import type {
  ComputedRelation,
  FamilyGuardianshipRelationship,
  FamilyParentageRelationship,
  FamilyPartnershipRelationship,
  FamilyRelationship,
  PeopleById,
  PersonId,
} from "./types";

export interface FamilyIndex<Person> {
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
  parentageByChild: Map<PersonId, FamilyParentageRelationship[]>;
  parentageByParent: Map<PersonId, FamilyParentageRelationship[]>;
  guardianshipByChild: Map<PersonId, FamilyGuardianshipRelationship[]>;
  guardianshipByGuardian: Map<PersonId, FamilyGuardianshipRelationship[]>;
  partnershipsByPerson: Map<PersonId, FamilyPartnershipRelationship[]>;
}

export interface FamilyRelative<Person> {
  personId: PersonId;
  person: Person;
  relation: ComputedRelation;
  order: number;
}

export interface FamilyNeighborhood<Person> {
  self: FamilyRelative<Person>;
  grandparents: FamilyRelative<Person>[];
  parents: FamilyRelative<Person>[];
  siblings: FamilyRelative<Person>[];
  halfSiblings: FamilyRelative<Person>[];
  partners: FamilyRelative<Person>[];
  children: FamilyRelative<Person>[];
  grandchildren: FamilyRelative<Person>[];
  relationships: FamilyRelationship[];
}

const autoLimits = {
  grandparents: 4,
  parents: 4,
  siblings: 8,
  halfSiblings: 8,
  partners: 3,
  children: 8,
  grandchildren: 8,
} as const;

const pushToMap = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
};

const byOrderThenId = <T extends { personId: PersonId; order: number }>(a: T, b: T) =>
  a.order - b.order || a.personId.localeCompare(b.personId);

const relationOrder = (relationships: FamilyRelationship[]): number => {
  let lowest = Number.POSITIVE_INFINITY;
  for (const relationship of relationships) {
    if (relationship.order !== undefined && relationship.order < lowest) {
      lowest = relationship.order;
    }
  }
  return lowest;
};

const hasPerson = <Person>(people: PeopleById<Person>, personId: PersonId): personId is keyof PeopleById<Person> =>
  Object.prototype.hasOwnProperty.call(people, personId);

const getPerson = <Person>(people: PeopleById<Person>, personId: PersonId): Person | undefined =>
  hasPerson(people, personId) ? people[personId] : undefined;

const compactIds = (ids: Iterable<PersonId>): PersonId[] => {
  const seen = new Set<PersonId>();
  const compacted: PersonId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    compacted.push(id);
  }
  return compacted;
};

const intersectionSize = (a: Set<PersonId>, b: Set<PersonId>) => {
  let count = 0;
  for (const value of a) {
    if (b.has(value)) count += 1;
  }
  return count;
};

const sameSet = (a: Set<PersonId>, b: Set<PersonId>) => {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
};

export function createFamilyIndex<Person>(
  people: PeopleById<Person>,
  relationships: FamilyRelationship[],
): FamilyIndex<Person> {
  const parentageByChild = new Map<PersonId, FamilyParentageRelationship[]>();
  const parentageByParent = new Map<PersonId, FamilyParentageRelationship[]>();
  const guardianshipByChild = new Map<PersonId, FamilyGuardianshipRelationship[]>();
  const guardianshipByGuardian = new Map<PersonId, FamilyGuardianshipRelationship[]>();
  const partnershipsByPerson = new Map<PersonId, FamilyPartnershipRelationship[]>();

  for (const relationship of relationships) {
    if (relationship.type === "parentage") {
      for (const child of relationship.children) {
        pushToMap(parentageByChild, child, relationship);
      }
      for (const parent of relationship.parents) {
        pushToMap(parentageByParent, parent, relationship);
      }
    }

    if (relationship.type === "guardianship") {
      for (const child of relationship.children) {
        pushToMap(guardianshipByChild, child, relationship);
      }
      for (const guardian of relationship.guardians) {
        pushToMap(guardianshipByGuardian, guardian, relationship);
      }
    }

    if (relationship.type === "partnership") {
      for (const partner of relationship.partners) {
        pushToMap(partnershipsByPerson, partner, relationship);
      }
    }
  }

  return {
    people,
    relationships,
    parentageByChild,
    parentageByParent,
    guardianshipByChild,
    guardianshipByGuardian,
    partnershipsByPerson,
  };
}

const parentageForChild = <Person>(index: FamilyIndex<Person>, childId: PersonId) =>
  index.parentageByChild.get(childId) ?? [];

const parentageForParent = <Person>(index: FamilyIndex<Person>, parentId: PersonId) =>
  index.parentageByParent.get(parentId) ?? [];

const getParents = <Person>(index: FamilyIndex<Person>, childId: PersonId) =>
  compactIds(parentageForChild(index, childId).flatMap((relationship) => relationship.parents));

const getChildren = <Person>(index: FamilyIndex<Person>, parentId: PersonId) =>
  compactIds(parentageForParent(index, parentId).flatMap((relationship) => relationship.children));

const getGuardians = <Person>(index: FamilyIndex<Person>, childId: PersonId) =>
  compactIds((index.guardianshipByChild.get(childId) ?? []).flatMap((relationship) => relationship.guardians ?? []));

const getGuardianChildren = <Person>(index: FamilyIndex<Person>, guardianId: PersonId) =>
  compactIds((index.guardianshipByGuardian.get(guardianId) ?? []).flatMap((relationship) => relationship.children ?? []));

const getExplicitPartners = <Person>(index: FamilyIndex<Person>, personId: PersonId) =>
  compactIds(
    (index.partnershipsByPerson.get(personId) ?? []).flatMap((relationship) =>
      relationship.partners.filter((partnerId) => partnerId !== personId),
    ),
  );

const relationshipOrderForPerson = <Person>(index: FamilyIndex<Person>, personId: PersonId) =>
  relationOrder(
    index.relationships.filter((relationship) => {
      if (relationship.type === "parentage") {
        return relationship.parents.includes(personId) || relationship.children.includes(personId);
      }
      if (relationship.type === "partnership") {
        return relationship.partners.includes(personId);
      }
      return relationship.guardians.includes(personId) || relationship.children.includes(personId);
    }),
  );

const createRelative = <Person>(
  index: FamilyIndex<Person>,
  personId: PersonId,
  relation: ComputedRelation,
): FamilyRelative<Person> | null => {
  const person = getPerson(index.people, personId);
  if (!person) return null;
  return {
    personId,
    person,
    relation,
    order: relationshipOrderForPerson(index, personId),
  };
};

const createRelatives = <Person>(
  index: FamilyIndex<Person>,
  ids: PersonId[],
  relation: ComputedRelation,
): FamilyRelative<Person>[] =>
  compactIds(ids)
    .map((id) => createRelative(index, id, relation))
    .filter((relative): relative is FamilyRelative<Person> => Boolean(relative))
    .toSorted(byOrderThenId);

const capRelatives = <Person>(relatives: FamilyRelative<Person>[], limit: number): FamilyRelative<Person>[] =>
  relatives.length > limit ? relatives.slice(0, limit) : relatives;

const mergeRelatives = <Person>(...groups: FamilyRelative<Person>[][]): FamilyRelative<Person>[] => {
  const seen = new Set<PersonId>();
  const merged: FamilyRelative<Person>[] = [];
  for (const group of groups) {
    for (const relative of group) {
      if (seen.has(relative.personId)) continue;
      seen.add(relative.personId);
      merged.push(relative);
    }
  }
  return merged.toSorted(byOrderThenId);
};

export function collectFamilyNeighborhood<Person>(
  index: FamilyIndex<Person>,
  subject: PersonId,
): FamilyNeighborhood<Person> | null {
  const self = createRelative(index, subject, { label: "self", generation: 0, side: "self" });
  if (!self) return null;

  const parentIds = getParents(index, subject);
  const guardianIds = getGuardians(index, subject);
  const guardianOnlyIds = guardianIds.filter((guardianId) => !parentIds.includes(guardianId));
  const subjectParentSet = new Set(parentIds);

  const childIds = compactIds([...getChildren(index, subject), ...getGuardianChildren(index, subject)]);
  const childSet = new Set(childIds);
  const coparentIds = compactIds(
    childIds.flatMap((childId) =>
      parentageForChild(index, childId).flatMap((relationship) =>
        relationship.parents.filter((parentId) => parentId !== subject),
      ),
    ),
  );

  const explicitPartnerIds = getExplicitPartners(index, subject);
  const coparentOnlyIds = coparentIds.filter((coparentId) => !explicitPartnerIds.includes(coparentId));

  const candidateSiblingIds = compactIds(
    parentIds.flatMap((parentId) => getChildren(index, parentId).filter((childId) => childId !== subject)),
  );
  const siblings: PersonId[] = [];
  const halfSiblings: PersonId[] = [];

  for (const candidateId of candidateSiblingIds) {
    const candidateParents = new Set(getParents(index, candidateId));
    if (subjectParentSet.size > 0 && sameSet(subjectParentSet, candidateParents)) {
      siblings.push(candidateId);
    } else if (intersectionSize(subjectParentSet, candidateParents) > 0) {
      halfSiblings.push(candidateId);
    }
  }

  const grandparentIds = compactIds(parentIds.flatMap((parentId) => getParents(index, parentId)));
  const grandchildIds = compactIds(childIds.flatMap((childId) => getChildren(index, childId)));

  return {
    self,
    grandparents: capRelatives(
      createRelatives(index, grandparentIds, {
        label: "grandparent",
        generation: -2,
        side: "ancestor",
      }),
      autoLimits.grandparents,
    ),
    parents: capRelatives(
      mergeRelatives(
        createRelatives(index, parentIds, {
          label: "parent",
          generation: -1,
          side: "ancestor",
        }),
        createRelatives(index, guardianOnlyIds, {
          label: "guardian",
          generation: -1,
          side: "ancestor",
        }),
      ),
      autoLimits.parents,
    ),
    siblings: capRelatives(
      createRelatives(index, siblings, {
        label: "sibling",
        generation: 0,
        side: "sibling",
      }),
      autoLimits.siblings,
    ),
    halfSiblings: capRelatives(
      createRelatives(index, halfSiblings, {
        label: "half-sibling",
        generation: 0,
        side: "sibling",
      }),
      autoLimits.halfSiblings,
    ),
    partners: capRelatives(
      mergeRelatives(
        createRelatives(index, explicitPartnerIds, {
          label: "partner",
          generation: 0,
          side: "partner",
        }),
        createRelatives(index, coparentOnlyIds, {
          label: "coparent",
          generation: 0,
          side: "partner",
        }),
      ),
      autoLimits.partners,
    ),
    children: capRelatives(
      createRelatives(index, childIds, {
        label: "child",
        generation: 1,
        side: "descendant",
      }).filter((relative) => !childSet.has(subject) && relative.personId !== subject),
      autoLimits.children,
    ),
    grandchildren: capRelatives(
      createRelatives(index, grandchildIds, {
        label: "grandchild",
        generation: 2,
        side: "descendant",
      }),
      autoLimits.grandchildren,
    ),
    relationships: index.relationships,
  };
}
