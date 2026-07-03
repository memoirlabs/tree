import type { TreeLayeredBox, TreeLayeredBoxInput } from "../../layout-engine";
import { roundTreeCoordinate } from "../../layout-engine";
import type { FamilyRelative } from "./family-indexing";
import type { FamilyRowItem } from "./family-row-planning";
import { personAnchorId } from "./family-row-planning";
import type { FamilyTreeLayoutCard } from "./layout-types";
import type { FamilyTreeSize, PersonId } from "./types";

const getSize = (
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personId: PersonId,
) => measurements[personId] ?? estimatedCardSize;

interface FamilyRelativeSlot<Person> {
  hiddenCard: boolean;
  offsetX: number;
  relative: FamilyRelative<Person>;
  size: FamilyTreeSize;
}

const createRelativeSlots = <Person>(
  item: FamilyRowItem<Person>,
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
  hiddenCardIds: ReadonlySet<PersonId>,
) => {
  let nextX = item.gapBefore ?? 0;
  let height = 0;
  const slots = item.relatives.map((relative): FamilyRelativeSlot<Person> => {
    const hiddenCard = hiddenCardIds.has(relative.personId);
    const size = hiddenCard ? { width: 0, height: 0 } : getSize(measurements, estimatedCardSize, relative.personId);
    const offsetX = nextX;
    height = Math.max(height, size.height);
    nextX += size.width + personGap;
    return { hiddenCard, offsetX, relative, size };
  });

  return {
    height,
    slots,
    width: Math.max(0, nextX - personGap + (item.gapAfter ?? 0)),
  };
};

const measureItem = <Person>(
  item: FamilyRowItem<Person>,
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
  hiddenCardIds: ReadonlySet<PersonId>,
) => {
  const { height, slots, width } = createRelativeSlots(
    item,
    measurements,
    estimatedCardSize,
    personGap,
    hiddenCardIds,
  );

  return {
    width,
    height,
    anchorPoints: slots.map((slot) => ({
      id: personAnchorId(slot.relative.personId),
      offsetX: slot.offsetX + slot.size.width / 2,
    })),
  };
};

export const createFamilyLayerBoxes = <Person>(
  layers: FamilyRowItem<Person>[][],
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
  hiddenCardIds: ReadonlySet<PersonId> = new Set(),
): TreeLayeredBoxInput<FamilyRowItem<Person>>[][] =>
  layers.map((layer) =>
    layer.map((item) => ({
      id: item.id,
      ...measureItem(item, measurements, estimatedCardSize, personGap, hiddenCardIds),
      anchorIds: item.anchorIds,
      data: item,
    })),
  );

export const createFamilyLayoutCards = <Person>(
  boxes: TreeLayeredBox<FamilyRowItem<Person>>[],
  measurements: Record<PersonId, FamilyTreeSize>,
  estimatedCardSize: FamilyTreeSize,
  personGap: number,
  hiddenCardIds: ReadonlySet<PersonId> = new Set(),
): FamilyTreeLayoutCard<Person>[] =>
  boxes.flatMap((box) => {
    if (!box.data) return [];
    const { slots } = createRelativeSlots(box.data, measurements, estimatedCardSize, personGap, hiddenCardIds);
    return slots.map((slot) => {
      const card = {
        personId: slot.relative.personId,
        person: slot.relative.person,
        relation: slot.relative.relation,
        x: roundTreeCoordinate(box.x + slot.offsetX),
        y: roundTreeCoordinate(box.y),
        width: slot.size.width,
        height: slot.size.height,
        ...(slot.hiddenCard ? { hiddenCard: true } : {}),
      };
      return card;
    });
  });
