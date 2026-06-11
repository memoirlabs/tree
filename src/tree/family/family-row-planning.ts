import type { FamilyNeighborhood, FamilyRelative } from "./family-indexing";
import type { FamilyRelationship, PersonId } from "./types";

export interface FamilyRowItem<Person> {
  id: string;
  relatives: FamilyRelative<Person>[];
  anchorIds?: string[];
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

const rowItemId = (ids: PersonId[]) => `family-row:${ids.join("|")}`;
const childGroupItemId = (relationship: FamilyRelationship, children: PersonId[]) =>
  `${relationship.type}:${relationship.id ?? relationship.groupId ?? children.join("|")}:${children.join("|")}`;
export const personAnchorId = (personId: PersonId) => `family-person-anchor:${personId}`;
export const relativeIds = <Person>(relatives: FamilyRelative<Person>[]) =>
  relatives.map((relative) => relative.personId);

const createSubjectRow = <Person>(
  neighborhood: Pick<
    FamilyNeighborhood<Person>,
    "siblings" | "halfSiblings" | "cousins" | "self" | "partners" | "relationships"
  >,
) => {
  const partners = orderSubjectPartners(neighborhood);
  const subjectClusterIds = new Set([
    neighborhood.self.personId,
    ...partners.map((partner) => partner.personId),
  ]);
  const splitIndex = Math.floor(partners.length / 2);
  const lateral = uniqueRelatives([
    ...neighborhood.siblings,
    ...neighborhood.cousins,
    ...neighborhood.halfSiblings,
  ]).filter((relative) => !subjectClusterIds.has(relative.personId));

  return uniqueRelatives([
    ...lateral,
    ...partners.slice(0, splitIndex),
    neighborhood.self,
    ...partners.slice(splitIndex),
  ]);
};

export const createFamilyRelativeRows = <Person>(neighborhood: FamilyNeighborhood<Person>) =>
  [
    ...neighborhood.ancestorGenerations
      .toReversed()
      .map((layer) =>
        uniqueRelatives(layer.generation === -1 ? [...layer.relatives, ...neighborhood.auntsUncles] : layer.relatives),
      ),
    createSubjectRow(neighborhood),
    ...neighborhood.descendantGenerations.map((layer) =>
      uniqueRelatives(layer.generation === 1 ? [...neighborhood.niecesNephews, ...layer.relatives] : layer.relatives),
    ),
  ].filter((row) => row.length > 0);

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

const createGroupedRowItems = <Person>(
  relatives: FamilyRelative<Person>[],
  relationships: FamilyRelationship[],
): FamilyRowItem<Person>[] => {
  const relativesById = new Map(relatives.map((relative) => [relative.personId, relative]));
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
    if (
      relationship.type === "parentage" &&
      relationship.parents.length > 1 &&
      relationship.parents.every((id) => relativesById.has(id))
    ) {
      addGroup(relationship.parents);
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
): FamilyRowItem<Person>[] => {
  const partners = orderSubjectPartners(neighborhood);
  const subjectClusterIds = new Set([
    neighborhood.self.personId,
    ...partners.map((partner) => partner.personId),
  ]);

  const splitIndex = Math.floor(partners.length / 2);
  const subjectCluster = [
    ...partners.slice(0, splitIndex),
    neighborhood.self,
    ...partners.slice(splitIndex),
  ];

  const lateralWithoutSubjectCluster = (relatives: FamilyRelative<Person>[]) =>
    uniqueRelatives(relatives).filter((relative) => !subjectClusterIds.has(relative.personId));

  return [
    ...singleRelativeItems(lateralWithoutSubjectCluster(neighborhood.siblings)),
    ...singleRelativeItems(lateralWithoutSubjectCluster(neighborhood.cousins)),
    { id: rowItemId(relativeIds(subjectCluster)), relatives: subjectCluster, anchorIds },
    ...singleRelativeItems(lateralWithoutSubjectCluster(neighborhood.halfSiblings)),
  ];
};

const orderSubjectPartners = <Person>(
  neighborhood: Pick<FamilyNeighborhood<Person>, "self" | "partners" | "relationships">,
) => {
  const partners = uniqueRelatives(neighborhood.partners);
  const partnersById = new Map(partners.map((partner) => [partner.personId, partner]));
  const childBearingPartnerIds: PersonId[] = [];

  for (const relationship of neighborhood.relationships.toSorted(byRelationshipOrder)) {
    if (relationship.type !== "parentage" || !relationship.parents.includes(neighborhood.self.personId)) continue;
    for (const parentId of relationship.parents) {
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
  const consumed = new Set<PersonId>();
  const items: Array<FamilyRowItem<Person> & { anchorOrder: number }> = [];

  for (const relationship of relationships.toSorted(byRelationshipOrder)) {
    if (relationship.type !== "parentage" && relationship.type !== "guardianship") continue;
    const parents = relationship.type === "parentage" ? relationship.parents : relationship.guardians;
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

    children.forEach((child) => consumed.add(child.personId));
    items.push({
      id: childGroupItemId(relationship, relativeIds(children)),
      relatives: children,
      anchorIds,
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
): FamilyRowItem<Person>[][] => {
  const visibleIds = new Set(visibleRows.flatMap(relativeIds));
  const visibleRelatives = (relatives: FamilyRelative<Person>[]) =>
    uniqueRelatives(relatives).filter((relative) => visibleIds.has(relative.personId));
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
        .flatMap((relationship) => relationship.parents)
        .filter((parentId) => previousPersonOrder.has(parentId))
        .map(personAnchorId),
    ),
  );
  appendLayer(createSubjectRowItems(visibleNeighborhood, subjectAnchorIds));

  for (const layer of visibleNeighborhood.descendantGenerations) {
    const relatives =
      layer.generation === 1
        ? uniqueRelatives([...visibleNeighborhood.niecesNephews, ...layer.relatives])
        : layer.relatives;
    appendLayer(createChildRowItems(relatives, neighborhood.relationships, previousPersonOrder));
  }

  return layers;
};
