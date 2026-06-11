import type {
  ComputedRelation,
  FamilyGuardianshipRelationship,
  FamilyNeighborhoodLimits,
  FamilyParentageRelationship,
  FamilyPartnershipRelationship,
  FamilyRelationship,
  PeopleById,
  PersonId,
} from "./types";

export interface FamilyIndex<Person> {
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
  relationshipOrderByPerson: Map<PersonId, number>;
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

export interface FamilyGenerationLayer<Person> {
  generation: number;
  relatives: FamilyRelative<Person>[];
}

export interface FamilyNeighborhood<Person> {
  self: FamilyRelative<Person>;
  ancestorGenerations: FamilyGenerationLayer<Person>[];
  descendantGenerations: FamilyGenerationLayer<Person>[];
  grandparents: FamilyRelative<Person>[];
  parents: FamilyRelative<Person>[];
  siblings: FamilyRelative<Person>[];
  halfSiblings: FamilyRelative<Person>[];
  auntsUncles: FamilyRelative<Person>[];
  cousins: FamilyRelative<Person>[];
  niecesNephews: FamilyRelative<Person>[];
  partners: FamilyRelative<Person>[];
  children: FamilyRelative<Person>[];
  grandchildren: FamilyRelative<Person>[];
  relationships: FamilyRelationship[];
}

export const defaultFamilyNeighborhoodLimits: FamilyNeighborhoodLimits = {
  ancestorGenerations: 2,
  descendantGenerations: 2,
  lateralFamilyGenerations: 0,
  grandparents: 4,
  parents: 4,
  siblings: 8,
  halfSiblings: 8,
  auntsUncles: 8,
  cousins: 12,
  niecesNephews: 12,
  partners: 3,
  children: 8,
  grandchildren: 8,
};

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

const relationshipPersonIds = (relationship: FamilyRelationship): PersonId[] => {
  if (relationship.type === "parentage") return [...relationship.parents, ...relationship.children];
  if (relationship.type === "partnership") return relationship.partners;
  return [...relationship.guardians, ...relationship.children];
};

const createRelationshipOrderByPerson = (relationships: FamilyRelationship[]) => {
  const relationshipOrderByPerson = new Map<PersonId, number>();
  for (const relationship of relationships) {
    if (relationship.order === undefined) continue;
    for (const personId of relationshipPersonIds(relationship)) {
      const existing = relationshipOrderByPerson.get(personId);
      if (existing === undefined || relationship.order < existing) {
        relationshipOrderByPerson.set(personId, relationship.order);
      }
    }
  }
  return relationshipOrderByPerson;
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

const assertNoParentageCycles = (parentageByParent: Map<PersonId, FamilyParentageRelationship[]>) => {
  const visiting = new Set<PersonId>();
  const visited = new Set<PersonId>();

  const visit = (personId: PersonId) => {
    if (visiting.has(personId)) {
      throw new Error(`FamilyTree contains a parentage cycle at "${personId}".`);
    }
    if (visited.has(personId)) return;

    visiting.add(personId);
    for (const relationship of parentageByParent.get(personId) ?? []) {
      for (const childId of relationship.children) {
        visit(childId);
      }
    }
    visiting.delete(personId);
    visited.add(personId);
  };

  for (const personId of parentageByParent.keys()) {
    visit(personId);
  }
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

  assertNoParentageCycles(parentageByParent);

  return {
    people,
    relationships,
    relationshipOrderByPerson: createRelationshipOrderByPerson(relationships),
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
  compactIds((index.guardianshipByChild.get(childId) ?? []).flatMap((relationship) => relationship.guardians));

const getGuardianChildren = <Person>(index: FamilyIndex<Person>, guardianId: PersonId) =>
  compactIds((index.guardianshipByGuardian.get(guardianId) ?? []).flatMap((relationship) => relationship.children));

const getExplicitPartners = <Person>(index: FamilyIndex<Person>, personId: PersonId) =>
  compactIds(
    (index.partnershipsByPerson.get(personId) ?? []).flatMap((relationship) =>
      relationship.partners.filter((partnerId) => partnerId !== personId),
    ),
  );

const relationshipOrderForPerson = <Person>(index: FamilyIndex<Person>, personId: PersonId) =>
  index.relationshipOrderByPerson.get(personId) ?? Number.POSITIVE_INFINITY;

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

const capRelatives = <Person>(relatives: FamilyRelative<Person>[], limit: number | null): FamilyRelative<Person>[] =>
  limit !== null && relatives.length > limit ? relatives.slice(0, limit) : relatives;

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

const collectVisiblePersonIds = <Person>(groups: FamilyRelative<Person>[][]) => {
  const visibleIds = new Set<PersonId>();
  for (const group of groups) {
    for (const relative of group) {
      visibleIds.add(relative.personId);
    }
  }
  return visibleIds;
};

const filterVisibleRelationships = (relationships: FamilyRelationship[], visibleIds: Set<PersonId>) =>
  relationships.filter((relationship) => {
    if (relationship.type === "partnership") {
      return relationship.partners.filter((personId) => visibleIds.has(personId)).length >= 2;
    }

    if (relationship.type === "parentage") {
      return (
        relationship.parents.some((personId) => visibleIds.has(personId)) &&
        relationship.children.some((personId) => visibleIds.has(personId))
      );
    }

    return (
      relationship.guardians.some((personId) => visibleIds.has(personId)) &&
      relationship.children.some((personId) => visibleIds.has(personId))
    );
  });

const generationLimitReached = (generation: number, limit: number | null) => limit !== null && generation > limit;

const ancestorLabelForGeneration = (generation: number): ComputedRelation["label"] => {
  if (generation === 1) return "parent";
  if (generation === 2) return "grandparent";
  return "ancestor";
};

const descendantLabelForGeneration = (generation: number): ComputedRelation["label"] => {
  if (generation === 1) return "child";
  if (generation === 2) return "grandchild";
  return "descendant";
};

const capGenerationRelatives = <Person>(
  generation: number,
  relatives: FamilyRelative<Person>[],
  limits: FamilyNeighborhoodLimits,
) => {
  if (generation === 1) return capRelatives(relatives, limits.parents);
  if (generation === 2) return capRelatives(relatives, limits.grandparents);
  return relatives;
};

const capDescendantRelatives = <Person>(
  generation: number,
  relatives: FamilyRelative<Person>[],
  limits: FamilyNeighborhoodLimits,
) => {
  if (generation === 1) return capRelatives(relatives, limits.children);
  if (generation === 2) return capRelatives(relatives, limits.grandchildren);
  return relatives;
};

const getParentLikeIds = <Person>(index: FamilyIndex<Person>, personId: PersonId) =>
  compactIds([...getParents(index, personId), ...getGuardians(index, personId)]);

const getChildLikeIds = <Person>(index: FamilyIndex<Person>, personId: PersonId) =>
  compactIds([...getChildren(index, personId), ...getGuardianChildren(index, personId)]);

const collectAncestorGenerations = <Person>(
  index: FamilyIndex<Person>,
  subject: PersonId,
  lateralParentIds: PersonId[],
  partnerParentIds: PersonId[],
  limits: FamilyNeighborhoodLimits,
): FamilyGenerationLayer<Person>[] => {
  const layers: FamilyGenerationLayer<Person>[] = [];
  const seen = new Set<PersonId>([subject]);
  let frontier = [subject];

  for (let generation = 1; !generationLimitReached(generation, limits.ancestorGenerations); generation += 1) {
    const ids = compactIds([
      ...frontier.flatMap((personId) => getParentLikeIds(index, personId)),
      ...(generation === 1 && limits.lateralFamilyGenerations !== 0
        ? [...lateralParentIds, ...partnerParentIds]
        : []),
    ]).filter((personId) => !seen.has(personId));
    if (ids.length === 0) break;
    ids.forEach((personId) => seen.add(personId));

    const relativesForGeneration =
      generation === 1
        ? mergeRelatives(
            createRelatives(index, getParents(index, subject), {
              label: "parent",
              generation: -generation,
              side: "ancestor",
            }),
            createRelatives(
              index,
              getGuardians(index, subject).filter((guardianId) => !getParents(index, subject).includes(guardianId)),
              {
                label: "guardian",
                generation: -generation,
                side: "ancestor",
              },
            ),
            createRelatives(index, lateralParentIds, {
              label: "parent",
              generation: -generation,
              side: "other",
            }),
            createRelatives(index, partnerParentIds, {
              label: "partner-parent",
              generation: -generation,
              side: "other",
            }),
          )
        : createRelatives(index, ids, {
            label: ancestorLabelForGeneration(generation),
            generation: -generation,
            side: "ancestor",
          });
    const relatives = capGenerationRelatives(generation, relativesForGeneration, limits);
    if (relatives.length > 0) layers.push({ generation: -generation, relatives });
    frontier =
      generation === 1
        ? compactIds([
            ...getParentLikeIds(index, subject),
            ...lateralParentIds,
          ]).filter((personId) => ids.includes(personId))
        : ids;
  }

  return layers;
};

const collectDescendantGenerations = <Person>(
  index: FamilyIndex<Person>,
  subject: PersonId,
  lateralIds: PersonId[],
  limits: FamilyNeighborhoodLimits,
): FamilyGenerationLayer<Person>[] => {
  const layers: FamilyGenerationLayer<Person>[] = [];
  const directSeen = new Set<PersonId>([subject]);
  const lateralSeen = new Set<PersonId>([subject, ...lateralIds]);
  let directFrontier = [subject];
  let lateralFrontier = lateralIds;

  for (let generation = 1; !generationLimitReached(generation, limits.descendantGenerations); generation += 1) {
    const directIds = compactIds(directFrontier.flatMap((personId) => getChildLikeIds(index, personId))).filter(
      (personId) => !directSeen.has(personId),
    );
    directIds.forEach((personId) => directSeen.add(personId));

    const shouldCollectLateral =
      limits.lateralFamilyGenerations === null || generation <= limits.lateralFamilyGenerations;
    const lateralOnlyIds = shouldCollectLateral
      ? compactIds(lateralFrontier.flatMap((personId) => getChildLikeIds(index, personId))).filter(
          (personId) => !directSeen.has(personId) && !lateralSeen.has(personId),
        )
      : [];
    lateralOnlyIds.forEach((personId) => lateralSeen.add(personId));

    const directRelatives = createRelatives(index, directIds, {
      label: descendantLabelForGeneration(generation),
      generation,
      side: "descendant",
    });
    const lateralRelatives = createRelatives(index, lateralOnlyIds, {
      label: "relative",
      generation,
      side: "other",
    });
    const relatives = capDescendantRelatives(generation, mergeRelatives(directRelatives, lateralRelatives), limits);
    if (relatives.length > 0) layers.push({ generation, relatives });

    if (directIds.length === 0 && lateralOnlyIds.length === 0) break;
    directFrontier = directIds;
    lateralFrontier = lateralOnlyIds;
  }

  return layers;
};

export function collectFamilyNeighborhood<Person>(
  index: FamilyIndex<Person>,
  subject: PersonId,
  limits?: Partial<FamilyNeighborhoodLimits>,
): FamilyNeighborhood<Person> | null {
  const self = createRelative(index, subject, { label: "self", generation: 0, side: "self" });
  if (!self) return null;
  const resolvedLimits = { ...defaultFamilyNeighborhoodLimits, ...limits };

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
  const partnerLikeIds = compactIds([...explicitPartnerIds, ...coparentOnlyIds]);

  const directRoleIds = new Set<PersonId>([
    subject,
    ...parentIds,
    ...guardianOnlyIds,
    ...childIds,
    ...partnerLikeIds,
  ]);

  const candidateSiblingIds = compactIds(
    parentIds.flatMap((parentId) => getChildren(index, parentId).filter((childId) => childId !== subject)),
  ).filter((personId) => !directRoleIds.has(personId));
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
  const shouldCollectImmediateLateral = resolvedLimits.lateralFamilyGenerations !== 0;
  const auntUncleIds = shouldCollectImmediateLateral
    ? compactIds(
        parentIds.flatMap((parentId) =>
          getParentLikeIds(index, parentId).flatMap((grandparentId) =>
            getChildLikeIds(index, grandparentId).filter((candidateId) => candidateId !== parentId),
          ),
        ),
      ).filter(
        (candidateId) =>
          !directRoleIds.has(candidateId) &&
          !siblings.includes(candidateId) &&
          !halfSiblings.includes(candidateId),
      )
    : [];
  const cousinIds = shouldCollectImmediateLateral
    ? compactIds(auntUncleIds.flatMap((personId) => getChildLikeIds(index, personId))).filter(
        (candidateId) =>
          !directRoleIds.has(candidateId) &&
          !siblings.includes(candidateId) &&
          !halfSiblings.includes(candidateId),
      )
    : [];
  const nieceNephewIds = shouldCollectImmediateLateral
    ? compactIds([...siblings, ...halfSiblings].flatMap((personId) => getChildLikeIds(index, personId))).filter(
        (candidateId) => !directRoleIds.has(candidateId),
      )
    : [];
  const lateralIds = compactIds([...siblings, ...halfSiblings, ...partnerLikeIds]);
  const lateralParentIds =
    resolvedLimits.lateralFamilyGenerations === 0
      ? []
      : compactIds([...siblings, ...halfSiblings].flatMap((personId) => getParentLikeIds(index, personId))).filter(
          (personId) => !directRoleIds.has(personId),
        );
  const partnerParentIds =
    resolvedLimits.lateralFamilyGenerations === 0
      ? []
      : compactIds(partnerLikeIds.flatMap((personId) => getParentLikeIds(index, personId)))
          .filter((personId) => !directRoleIds.has(personId) && !lateralIds.includes(personId));
  const ancestorGenerations = collectAncestorGenerations(
    index,
    subject,
    lateralParentIds,
    partnerParentIds,
    resolvedLimits,
  );
  const descendantGenerations = collectDescendantGenerations(index, subject, lateralIds, resolvedLimits);

  const grandparents =
    ancestorGenerations.find((layer) => layer.generation === -2)?.relatives ??
    capRelatives(
      createRelatives(index, grandparentIds, {
        label: "grandparent",
        generation: -2,
        side: "ancestor",
      }),
      resolvedLimits.grandparents,
    );
  const parents =
    ancestorGenerations.find((layer) => layer.generation === -1)?.relatives ??
    capRelatives(
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
      resolvedLimits.parents,
    );
  const siblingRelatives = capRelatives(
    createRelatives(index, siblings, {
      label: "sibling",
      generation: 0,
      side: "sibling",
    }),
    resolvedLimits.siblings,
  );
  const halfSiblingRelatives = capRelatives(
    createRelatives(index, halfSiblings, {
      label: "half-sibling",
      generation: 0,
      side: "sibling",
    }),
    resolvedLimits.halfSiblings,
  );
  const auntUncleRelatives = capRelatives(
    createRelatives(index, auntUncleIds, {
      label: "aunt-uncle",
      generation: -1,
      side: "other",
    }),
    resolvedLimits.auntsUncles,
  );
  const cousinRelatives = capRelatives(
    createRelatives(index, cousinIds, {
      label: "cousin",
      generation: 0,
      side: "other",
    }),
    resolvedLimits.cousins,
  );
  const nieceNephewRelatives = capRelatives(
    createRelatives(index, nieceNephewIds, {
      label: "niece-nephew",
      generation: 1,
      side: "other",
    }),
    resolvedLimits.niecesNephews,
  );
  const partnerRelatives = capRelatives(
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
    resolvedLimits.partners,
  );
  const children = capRelatives(
    createRelatives(index, childIds, {
      label: "child",
      generation: 1,
      side: "descendant",
    }).filter((relative) => !childSet.has(subject) && relative.personId !== subject),
    resolvedLimits.children,
  );
  const grandchildren = capRelatives(
    createRelatives(index, grandchildIds, {
      label: "grandchild",
      generation: 2,
      side: "descendant",
    }),
    resolvedLimits.grandchildren,
  );
  const visibleIds = collectVisiblePersonIds([
    [self],
    grandparents,
    parents,
    siblingRelatives,
    halfSiblingRelatives,
    auntUncleRelatives,
    cousinRelatives,
    nieceNephewRelatives,
    partnerRelatives,
    children,
    grandchildren,
    ...ancestorGenerations.map((layer) => layer.relatives),
    ...descendantGenerations.map((layer) => layer.relatives),
  ]);

  return {
    self,
    ancestorGenerations,
    descendantGenerations,
    grandparents,
    parents,
    siblings: siblingRelatives,
    halfSiblings: halfSiblingRelatives,
    auntsUncles: auntUncleRelatives,
    cousins: cousinRelatives,
    niecesNephews: nieceNephewRelatives,
    partners: partnerRelatives,
    children,
    grandchildren,
    relationships: filterVisibleRelationships(index.relationships, visibleIds),
  };
}
