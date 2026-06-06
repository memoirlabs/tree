"use client";

import type { ComponentType, HTMLAttributes, JSX } from "react";
import type { TreeLayoutCardBase } from "./types";

type TreeNodeDomProps = HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | number | undefined>;

export interface TreeNodeLayerProps<
  Person,
  LayoutCard extends TreeLayoutCardBase<Person>,
  CardProps extends object,
> {
  card: ComponentType<CardProps>;
  cards: LayoutCard[];
  getCardProps: (card: LayoutCard) => CardProps;
  getMeasureProps?: (card: LayoutCard) => TreeNodeDomProps;
  getPositionerProps?: (card: LayoutCard) => TreeNodeDomProps;
}

export function TreeNodeLayer<
  Person,
  LayoutCard extends TreeLayoutCardBase<Person>,
  CardProps extends object,
>({
  card: Card,
  cards,
  getCardProps,
  getMeasureProps,
  getPositionerProps,
}: TreeNodeLayerProps<Person, LayoutCard, CardProps>): JSX.Element {
  return (
    <>
      {cards.map((layoutCard) => {
        const measureProps = getMeasureProps?.(layoutCard);
        const positionerProps = getPositionerProps?.(layoutCard);
        return (
          <div
            key={layoutCard.personId}
            data-person-id={layoutCard.personId}
            data-tree-card-positioner
            {...positionerProps}
            style={{
              left: 0,
              position: "absolute",
              touchAction: "inherit",
              top: 0,
              transform: `translate(${layoutCard.x}px, ${layoutCard.y}px)`,
              ...positionerProps?.style,
            }}
          >
            <div
              data-tree-measure-id={layoutCard.personId}
              {...measureProps}
              style={{
                touchAction: "inherit",
                ...measureProps?.style,
              }}
            >
              <Card {...getCardProps(layoutCard)} />
            </div>
          </div>
        );
      })}
    </>
  );
}
