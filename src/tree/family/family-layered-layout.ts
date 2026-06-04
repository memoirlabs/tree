import type { TreeLayeredBox, TreeLayeredBoxInput } from "../core";
import { roundTreeCoordinate } from "../core";
import type { FamilyNeighborhood, FamilyRelative } from "./family-indexing";
import type { FamilyTreeLayoutCard } from "./layout-types";
import type { FamilyRelationship, FamilyTreeSize, PersonId } from "./types";

interface FamilyRowItem<Person> {
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
const personAnchorId = (personId: PersonId) => `family-person-anchor:${personId}`;
const relativeIds = <Person>(relatives: FamilyRelative<Person>[]) => relatives.map((relative) => relative.personId);
const getSize = (
  measurements: Record<PersonId, FamilyTreeSize>,
  fallbackCardSize: FamilyTreeSize,
  personId: PersonId,
) => measurements[personId] ?? fallbackCardSize;

const createSubjectRow = <Person>(neighborhood: Pick<FamilyNeighborhood<Person>, "siblings" | "halfSiblings" | "self" | "partners">) => {
  const partners = uniqueRelatives(neighborhood.partners);
  const splitIndex = Math.floor(partners.length / 2);
  return uniqueRelatives([
    ...neighborhood.siblings,
    ...neighborhood.halfSiblings,
    ...partners.slice(0, splitIndex),
    neighborhood.self,
    ...partners.slice(splitIndex),
  ]);
};

export const createFamilyRelativeRows = <Person>(neighborhood: FamilyNeighborhood<Person>) =>
  [
    uniqueRelatives(neighborhood.grandparents),
    uniqueRelatives(neighborhood.parents),
    createSubjectRow(neighborhood),
    uniqueRelatives(neighborhood.children),
    uniqueRelatives(neighborhood.grandchildren),
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
  neighborhood: Pick<FamilyNeighborhood<Person>, "siblings" | "halfSiblings" | "self" | "partners">,
  anchorIds: string[],
): FamilyRowItem<Person>[] => {
  const partners = uniqueRelatives(neighborhood.partners);
  const subjectCluster =
    partners.length <= 1
      ? [neighborhood.self, ...partners]
      : [partners[0], neighborhood.self, ...partners.slice(1)].filter(
          (relative): relative is FamilyRelative<Person> => Boolean(relative),
        );

  return [
    ...singleRelativeItems(uniqueRelatives(neighborhood.siblings)),
    { id: rowItemId(relativeIds(subjectCluster)), relatives: subjectCluster, anchorIds },
    ...singleRelativeItems(uniqueRelatives(neighborhood.halfSiblings)),
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
    grandparents: visibleRelatives(neighborhood.grandparents),
    parents: visibleRelatives(neighborhood.parents),
    siblings: visibleRelatives(neighborhood.siblings),
    halfSiblings: visibleRelatives(neighborhood.halfSiblings),
    partners: visibleRelatives(neighborhood.partners),
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

  appendLayer(createGroupedRowItems(visibleNeighborhood.grandparents, neighborhood.relationships));
  appendLayer(createGroupedRowItems(visibleNeighborhood.parents, neighborhood.relationships));

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

  appendLayer(createChildRowItems(visibleNeighborhood.children, neighborhood.relationships, previousPersonOrder));
  appendLayer(createChildRowItems(visibleNeighborhood.grandchildren, neighborhood.relationships, previousPersonOrder));

  return layers;
};

const measureItem = <Person>(
  item: FamilyRowItem<Person>,
  measurements: Record<PersonId, FamilyTreeSize>,
  fallbackCardSize: FamilyTreeSize,
  personGap: number,
) => {
  let x = 0;
  let height = 0;
  const anchorPoints = item.relatives.map((relative) => {
    const size = getSize(measurements, fallbackCardSize, relative.personId);
    height = Math.max(height, size.height);
    const anchorPoint = { id: personAnchorId(relative.personId), offsetX: x + size.width / 2 };
    x += size.width + personGap;
    return anchorPoint;
  });

  return {
    width: x - personGap,
    height,
    anchorPoints,
  };
};

export const createFamilyLayerBoxes = <Person>(
  layers: FamilyRowItem<Person>[][],
  measurements: Record<PersonId, FamilyTreeSize>,
  fallbackCardSize: FamilyTreeSize,
  personGap: number,
): TreeLayeredBoxInput<FamilyRowItem<Person>>[][] =>
  layers.map((layer) =>
    layer.map((item) => ({
      id: item.id,
      ...measureItem(item, measurements, fallbackCardSize, personGap),
      anchorIds: item.anchorIds,
      data: item,
    })),
  );

export const createFamilyLayoutCards = <Person>(
  boxes: TreeLayeredBox<FamilyRowItem<Person>>[],
  measurements: Record<PersonId, FamilyTreeSize>,
  fallbackCardSize: FamilyTreeSize,
  personGap: number,
): FamilyTreeLayoutCard<Person>[] =>
  boxes.flatMap((box) => {
    if (!box.data) return [];
    let x = box.x;
    return box.data.relatives.map((relative) => {
      const size = getSize(measurements, fallbackCardSize, relative.personId);
      const card = {
        personId: relative.personId,
        person: relative.person,
        relation: relative.relation,
        x: roundTreeCoordinate(x),
        y: roundTreeCoordinate(box.y),
        width: size.width,
        height: size.height,
      };
      x += size.width + personGap;
      return card;
    });
  });
