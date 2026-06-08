import type { TreeLayeredBox, TreeLayeredBoxInput } from "../../layout-engine";
import { roundTreeCoordinate } from "../../layout-engine";
import type { FamilyRowItem } from "./family-row-planning";
import { personAnchorId } from "./family-row-planning";
import type { FamilyTreeLayoutCard } from "./layout-types";
import type { FamilyTreeSize, PersonId } from "./types";

const getSize = (
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personId: PersonId,
) => measurements[personId] ?? estimatedCardSize;

const measureItem = <Person>(
  item: FamilyRowItem<Person>,
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
) => {
  let x = 0;
  let height = 0;
  const anchorPoints = item.relatives.map((relative) => {
    const size = getSize(measurements, estimatedCardSize, relative.personId);
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
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
): TreeLayeredBoxInput<FamilyRowItem<Person>>[][] =>
  layers.map((layer) =>
    layer.map((item) => ({
      id: item.id,
      ...measureItem(item, measurements, estimatedCardSize, personGap),
      anchorIds: item.anchorIds,
      data: item,
    })),
  );

export const createFamilyLayoutCards = <Person>(
  boxes: TreeLayeredBox<FamilyRowItem<Person>>[],
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
): FamilyTreeLayoutCard<Person>[] =>
  boxes.flatMap((box) => {
    if (!box.data) return [];
    let x = box.x;
    return box.data.relatives.map((relative) => {
      const size = getSize(measurements, estimatedCardSize, relative.personId);
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
