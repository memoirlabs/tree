import type { FamilyNeighborhood, FamilyRelative } from "./family-indexing";
import type { ComputedRelation, FamilyRelationship, FamilyTreeLayoutMode, FamilyTreeLayoutPolicy, PersonId } from "./types";
import { createPartnershipByGroupId, getVisualParentIds } from "./family-visual-parents";

export interface FamilyRowItem<Person> {
  id: string;
  relatives: FamilyRelative<Person>[];
  anchorIds?: string[];
  anchorRelativeIds?: PersonId[];
  gapBefore?: number;
  gapAfter?: number;
}

const relationshipOrder = (relationship: FamilyRelationship) => relationship.order ?? Number.POSITIVE_INFINITY;

const byRelationshipOrder = (a: FamilyRelationship, b: FamilyRelationship) =>
  relationshipOrder(a) - relationshipOrder(b) || (a.id ?? "").localeCompare(b.id ?? "");

const uniqueRelatives = <Person>(relatives: FamilyRelative<Person>[]) => {
  const seen = new Set<PersonId>();
  return relatives.filter((relative) => {
    if (seen.has(relative.personId)) return false;
    seen.add(relative.personId);
    return true;
  });
};

const relationPriority = (relation: ComputedRelation) => {
  if (relation.label === "self") return 0;
  if ((relation.label === "parent" || relation.label === "guardian") && relation.side === "ancestor") return 1;
  if (relation.label === "child" && relation.side === "descendant") return 2;
  if (relation.label === "partner" || relation.label === "coparent") return 3;
  if (relation.label === "sibling" || relation.label === "half-sibling") return 4;
  if (relation.label === "grandparent" || relation.label === "grandchild") return 5;
  if (relation.label === "aunt-uncle" || relation.label === "cousin" || relation.label === "niece-nephew") return 6;
  if (relation.label === "ancestor" || relation.label === "descendant") return 7;
  return 8;
};

const sameRelation = (a: ComputedRelation, b: ComputedRelation) =>
  a.label === b.label && a.generation === b.generation && a.side === b.side;

const createPreferredRelationByPerson = <Person>(rows: FamilyRelative<Person>[][]) => {
  const preferred = new Map<PersonId, FamilyRelative<Person>>();
  for (const relative of rows.flat()) {
    const current = preferred.get(relative.personId);
    if (!current || relationPriority(relative.relation) < relationPriority(current.relation)) {
      preferred.set(relative.personId, relative);
    }
  }
  return preferred;
};

const filterToPreferredVisibleRelatives = <Person>(rows: FamilyRelative<Person>[][]) => {
  const preferred = createPreferredRelationByPerson(rows);
  const consumed = new Set<PersonId>();

  return rows
    .map((row) =>
      row.filter((relative) => {
        const preferredRelative = preferred.get(relative.personId);
        if (!preferredRelative || !sameRelation(relative.relation, preferredRelative.relation)) return false;
        if (consumed.has(relative.personId)) return false;
        consumed.add(relative.personId);
        return true;
      }),
    )
    .filter((row) => row.length > 0);
};

const rowItemId = (ids: PersonId[]) => `family-row:${ids.join("|")}`;
const childGroupItemId = (relationship: FamilyRelationship, children: PersonId[]) =>
  `${relationship.type}:${relationship.id ?? relationship.groupId ?? children.join("|")}:${children.join("|")}`;
export const personAnchorId = (personId: PersonId) => `family-person-anchor:${personId}`;
export const relativeIds = <Person>(relatives: FamilyRelative<Person>[]) =>
  relatives.map((relative) => relative.personId);

const createSubjectRowPlan = <Person>(
  neighborhood: Pick<
    FamilyNeighborhood<Person>,
    "siblings" | "halfSiblings" | "cousins" | "self" | "partners" | "relationships"
  >,
  layoutMode: FamilyTreeLayoutMode,
  layoutPolicy: FamilyTreeLayoutPolicy = {},
) => {
  const partners = orderSubjectPartners(neighborhood);
  const subjectClusterIds = new Set([
    neighborhood.self.personId,
    ...partners.map((partner) => partner.personId),
  ]);
  const subjectPartnerPlacement = layoutPolicy.subjectPartnerPlacement ?? "balanced";
  const splitIndex = subjectPartnerPlacement === "after-subject" ? 0 : Math.floor(partners.length / 2);
  const lateralWithoutSubjectCluster = (relatives: FamilyRelative<Person>[]) =>
    uniqueRelatives(relatives).filter((relative) => !subjectClusterIds.has(relative.personId));

  return {
    partners,
    subjectCluster: [
      ...partners.slice(0, splitIndex),
      neighborhood.self,
      ...partners.slice(splitIndex),
    ],
    lateralCluster: lateralWithoutSubjectCluster([
      ...neighborhood.siblings,
      ...neighborhood.cousins,
      ...neighborhood.halfSiblings,
    ]),
    siblingCluster: lateralWithoutSubjectCluster([
      ...neighborhood.siblings,
      ...(layoutMode === "compact-family" ? neighborhood.halfSiblings : []),
    ]),
    cousinCluster: lateralWithoutSubjectCluster(neighborhood.cousins),
    halfSiblingCluster:
      layoutMode === "compact-family" ? [] : lateralWithoutSubjectCluster(neighborhood.halfSiblings),
  };
};

const createSubjectRow = <Person>(
  neighborhood: Pick<
    FamilyNeighborhood<Person>,
    "siblings" | "halfSiblings" | "cousins" | "self" | "partners" | "relationships"
  >,
  layoutMode: FamilyTreeLayoutMode = "default",
  layoutPolicy: FamilyTreeLayoutPolicy = {},
) => {
  const plan = createSubjectRowPlan(neighborhood, layoutMode, layoutPolicy);

  return uniqueRelatives([
    ...plan.lateralCluster,
    ...plan.subjectCluster,
  ]);
};

export const createFamilyRelativeRows = <Person>(
  neighborhood: FamilyNeighborhood<Person>,
  layoutMode: FamilyTreeLayoutMode = "default",
  layoutPolicy: FamilyTreeLayoutPolicy = {},
) =>
  filterToPreferredVisibleRelatives([
    ...neighborhood.ancestorGenerations
      .toReversed()
      .map((layer) =>
        uniqueRelatives(layer.generation === -1 ? [...layer.relatives, ...neighborhood.auntsUncles] : layer.relatives),
      ),
    createSubjectRow(neighborhood, layoutMode, layoutPolicy),
    ...neighborhood.descendantGenerations.map((layer) =>
      uniqueRelatives(layer.generation === 1 ? [...neighborhood.niecesNephews, ...layer.relatives] : layer.relatives),
    ),
  ]);

const createVisiblePersonOrder = <Person>(items: FamilyRowItem<Person>[]) =>
  new Map(
    items
      .flatMap((item) => item.relatives.map((relative) => relative.personId))
      .map((personId, index) => [personId, index]),
  );

const singleRelativeItems = <Person>(relatives: FamilyRelative<Person>[]) =>
  relatives.map((relative) => ({
    id: rowItemId([relative.personId]),
    relatives: [relative],
  }));

const relativeClusterItem = <Person>(
  relatives: FamilyRelative<Person>[],
  options: Pick<FamilyRowItem<Person>, "anchorIds" | "gapAfter" | "gapBefore"> = {},
): FamilyRowItem<Person>[] => {
  const unique = uniqueRelatives(relatives);
  return unique.length > 0 ? [{ id: rowItemId(relativeIds(unique)), relatives: unique, ...options }] : [];
};

const createGroupedRowItems = <Person>(
  relatives: FamilyRelative<Person>[],
  relationships: FamilyRelationship[],
): FamilyRowItem<Person>[] => {
  const relativesById = new Map(relatives.map((relative) => [relative.personId, relative]));
  const partnershipByGroupId = createPartnershipByGroupId(relationships);
  const consumed = new Set<PersonId>();
  const items: FamilyRowItem<Person>[] = [];

  const addGroup = (ids: PersonId[]) => {
    const group = uniqueRelatives(
      ids.map((id) => relativesById.get(id)).filter((relative): relative is FamilyRelative<Person> => Boolean(relative)),
    );
    if (group.length < 2 || group.some((relative) => consumed.has(relative.personId))) return;
    group.forEach((relative) => consumed.add(relative.personId));
    items.push({ id: rowItemId(relativeIds(group)), relatives: group });
  };

  for (const relationship of relationships.toSorted(byRelationshipOrder)) {
    if (relationship.type === "partnership" && relationship.partners.every((id) => relativesById.has(id))) {
      addGroup(relationship.partners);
    }
    if (relationship.type === "parentage") {
      const parents = getVisualParentIds(relationship, partnershipByGroupId);
      if (parents.length > 1 && parents.every((id) => relativesById.has(id))) {
        addGroup(parents);
      }
    }
  }

  return [...items, ...singleRelativeItems(relatives.filter((relative) => !consumed.has(relative.personId)))];
};

const createSubjectRowItems = <Person>(
  neighborhood: Pick<
    FamilyNeighborhood<Person>,
    "siblings" | "halfSiblings" | "cousins" | "self" | "partners" | "relationships"
  >,
  anchorIds: string[],
  layoutMode: FamilyTreeLayoutMode,
  layoutPolicy: FamilyTreeLayoutPolicy = {},
): FamilyRowItem<Person>[] => {
  const plan = createSubjectRowPlan(neighborhood, layoutMode, layoutPolicy);
  const hasLeftCluster = plan.siblingCluster.length > 0 || plan.cousinCluster.length > 0;
  const subjectGapBefore = hasLeftCluster && plan.partners.length > 0 ? 40 : undefined;

  return [
    ...relativeClusterItem(plan.siblingCluster),
    ...relativeClusterItem(plan.cousinCluster),
    { id: rowItemId(relativeIds(plan.subjectCluster)), relatives: plan.subjectCluster, anchorIds, gapBefore: subjectGapBefore },
    ...relativeClusterItem(plan.halfSiblingCluster, plan.partners.length > 0 ? { gapBefore: 40 } : {}),
  ];
};

const orderSubjectPartners = <Person>(
  neighborhood: Pick<FamilyNeighborhood<Person>, "self" | "partners" | "relationships">,
) => {
  const partners = uniqueRelatives(neighborhood.partners);
  const partnersById = new Map(partners.map((partner) => [partner.personId, partner]));
  const partnershipByGroupId = createPartnershipByGroupId(neighborhood.relationships);
  const childBearingPartnerIds: PersonId[] = [];

  for (const relationship of neighborhood.relationships.toSorted(byRelationshipOrder)) {
    if (relationship.type !== "parentage" || !relationship.parents.includes(neighborhood.self.personId)) continue;
    for (const parentId of getVisualParentIds(relationship, partnershipByGroupId)) {
      if (parentId === neighborhood.self.personId || !partnersById.has(parentId)) continue;
      if (!childBearingPartnerIds.includes(parentId)) childBearingPartnerIds.push(parentId);
    }
  }

  const leftChildPartners: FamilyRelative<Person>[] = [];
  const rightChildPartners: FamilyRelative<Person>[] = [];
  childBearingPartnerIds.forEach((partnerId, index) => {
    const partner = partnersById.get(partnerId);
    if (!partner) return;
    if (index % 2 === 0) {
      leftChildPartners.push(partner);
    } else {
      rightChildPartners.push(partner);
    }
  });

  const childBearingPartnerSet = new Set(childBearingPartnerIds);
  const otherPartners = partners.filter((partner) => !childBearingPartnerSet.has(partner.personId));
  const otherSplitIndex = Math.floor(otherPartners.length / 2);

  return [
    ...otherPartners.slice(0, otherSplitIndex),
    ...leftChildPartners.toReversed(),
    ...rightChildPartners,
    ...otherPartners.slice(otherSplitIndex),
  ];
};

const createChildRowItems = <Person>(
  relatives: FamilyRelative<Person>[],
  relationships: FamilyRelationship[],
  previousPersonOrder: Map<PersonId, number>,
): FamilyRowItem<Person>[] => {
  const relativesById = new Map(relatives.map((relative) => [relative.personId, relative]));
  const partnershipByGroupId = createPartnershipByGroupId(relationships);
  const consumed = new Set<PersonId>();
  const items: Array<FamilyRowItem<Person> & { anchorOrder: number }> = [];

  for (const relationship of relationships.toSorted(byRelationshipOrder)) {
    if (relationship.type !== "parentage" && relationship.type !== "guardianship") continue;
    const parents =
      relationship.type === "parentage"
        ? getVisualParentIds(relationship, partnershipByGroupId)
        : relationship.guardians;
    const visibleParentOrders = parents
      .map((parentId) => previousPersonOrder.get(parentId))
      .filter((order): order is number => order !== undefined);
    const anchorIds = parents.filter((parentId) => previousPersonOrder.has(parentId)).map(personAnchorId);
    if (anchorIds.length === 0) continue;

    const children = relationship.children
      .map((childId) => relativesById.get(childId))
      .filter((relative): relative is FamilyRelative<Person> => Boolean(relative))
      .filter((relative) => !consumed.has(relative.personId));
    if (children.length === 0) continue;

    const childGroups = children.map((child) => {
      const coparents = relationships
        .filter(
          (candidate): candidate is Extract<FamilyRelationship, { type: "parentage" }> =>
            candidate.type === "parentage" && candidate.parents.includes(child.personId),
        )
        .flatMap((candidate) =>
          getVisualParentIds(candidate, partnershipByGroupId)
            .filter((parentId) => parentId !== child.personId)
            .map((parentId) => relativesById.get(parentId))
            .filter((relative): relative is FamilyRelative<Person> => Boolean(relative))
            .filter((relative) => !consumed.has(relative.personId)),
        );
      return { child, coparents: uniqueRelatives(coparents) };
    });
    const plainChildren = childGroups
      .filter((group) => group.coparents.length === 0)
      .map((group) => group.child);
    const childBearingRelatives = childGroups.flatMap((group) =>
      group.coparents.length > 0 ? [group.child, ...group.coparents] : [],
    );
    const itemRelatives = uniqueRelatives([...plainChildren, ...childBearingRelatives]);
    itemRelatives.forEach((relative) => consumed.add(relative.personId));
    items.push({
      id: childGroupItemId(relationship, relativeIds(itemRelatives)),
      relatives: itemRelatives,
      anchorIds,
      anchorRelativeIds: relativeIds(children),
      anchorOrder: visibleParentOrders.reduce((sum, order) => sum + order, 0) / visibleParentOrders.length,
    });
  }

  return [
    ...items.toSorted((a, b) => a.anchorOrder - b.anchorOrder).map(({ anchorOrder: _anchorOrder, ...item }) => item),
    ...singleRelativeItems(relatives.filter((relative) => !consumed.has(relative.personId))),
  ];
};

export const createFamilyLayoutLayers = <Person>(
  neighborhood: FamilyNeighborhood<Person>,
  visibleRows: FamilyRelative<Person>[][],
  layoutMode: FamilyTreeLayoutMode = "default",
  layoutPolicy: FamilyTreeLayoutPolicy = {},
): FamilyRowItem<Person>[][] => {
  const preferredVisibleRelatives = createPreferredRelationByPerson(visibleRows);
  const visibleRelatives = (relatives: FamilyRelative<Person>[]) =>
    uniqueRelatives(relatives).filter((relative) => {
      const visibleRelative = preferredVisibleRelatives.get(relative.personId);
      return visibleRelative ? sameRelation(relative.relation, visibleRelative.relation) : false;
    });
  const visibleNeighborhood = {
    ...neighborhood,
    ancestorGenerations: neighborhood.ancestorGenerations.map((layer) => ({
      ...layer,
      relatives: visibleRelatives(layer.relatives),
    })),
    grandparents: visibleRelatives(neighborhood.grandparents),
    parents: visibleRelatives(neighborhood.parents),
    siblings: visibleRelatives(neighborhood.siblings),
    halfSiblings: visibleRelatives(neighborhood.halfSiblings),
    auntsUncles: visibleRelatives(neighborhood.auntsUncles),
    cousins: visibleRelatives(neighborhood.cousins),
    niecesNephews: visibleRelatives(neighborhood.niecesNephews),
    partners: visibleRelatives(neighborhood.partners),
    descendantGenerations: neighborhood.descendantGenerations.map((layer) => ({
      ...layer,
      relatives: visibleRelatives(layer.relatives),
    })),
    children: visibleRelatives(neighborhood.children),
    grandchildren: visibleRelatives(neighborhood.grandchildren),
  };
  const layers: FamilyRowItem<Person>[][] = [];
  let previousPersonOrder = new Map<PersonId, number>();
  const partnershipByGroupId = createPartnershipByGroupId(neighborhood.relationships);

  const appendLayer = (items: FamilyRowItem<Person>[]) => {
    if (items.length === 0) return;
    layers.push(items);
    previousPersonOrder = createVisiblePersonOrder(items);
  };

  for (const layer of visibleNeighborhood.ancestorGenerations.toReversed()) {
    const relatives =
      layer.generation === -1 ? uniqueRelatives([...layer.relatives, ...visibleNeighborhood.auntsUncles]) : layer.relatives;
    appendLayer(createGroupedRowItems(relatives, neighborhood.relationships));
  }

  const subjectAnchorIds = Array.from(
    new Set(
      neighborhood.relationships
        .filter(
          (relationship): relationship is Extract<FamilyRelationship, { type: "parentage" }> =>
            relationship.type === "parentage" && relationship.children.includes(neighborhood.self.personId),
        )
        .flatMap((relationship) => getVisualParentIds(relationship, partnershipByGroupId))
        .filter((parentId) => previousPersonOrder.has(parentId))
        .map(personAnchorId),
    ),
  );
  appendLayer(createSubjectRowItems(visibleNeighborhood, subjectAnchorIds, layoutMode, layoutPolicy));

  for (const layer of visibleNeighborhood.descendantGenerations) {
    const relatives =
      layer.generation === 1
        ? uniqueRelatives([...visibleNeighborhood.niecesNephews, ...layer.relatives])
        : layer.relatives;
    appendLayer(createChildRowItems(relatives, neighborhood.relationships, previousPersonOrder));
  }

  return layers;
};
