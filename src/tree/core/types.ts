import type { ComponentType, CSSProperties, HTMLAttributes, JSX, Ref } from "react";

export type PersonId = string;

export type PeopleById<Person> = Record<PersonId, Person>;

export interface TreeCardSize {
  width: number;
  height: number;
}

export interface TreeBounds {
  width: number;
  height: number;
}

export interface TreeLayoutCardBase<Person> extends TreeCardSize {
  personId: PersonId;
  person: Person;
  x: number;
  y: number;
}

export interface TreeLayoutEdge {
  id: string;
  path: string;
  kind?: string;
  status?: string;
  sourceId?: PersonId;
  targetId?: PersonId;
}

export interface TreeLayoutResult<Person, Card extends TreeLayoutCardBase<Person> = TreeLayoutCardBase<Person>> {
  cards: Card[];
  edges: TreeLayoutEdge[];
  bounds: TreeBounds;
}

export interface TreeSpacing {
  row: number;
  column: number;
  padding: number;
}

export type TreeInteractionMode = "pan" | "scroll" | "none";

export interface TreeViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface TreeApi {
  centerPerson: (personId: PersonId) => void;
  fitToSubject: () => void;
  resetViewport: () => void;
  zoomTo: (zoom: number) => void;
}

export type TreeLineShape = "orthogonal" | "curved";

export type TreeStylePreset = "memoir" | "system";

export type TreeThemeStyle = CSSProperties & Record<`--tree-${string}`, string | number | undefined>;

export type TreePersonHandler<Person> = (person: Person, personId: PersonId) => void;

export type TreeCardProps<Person, CardProps> =
  | CardProps
  | ((person: Person, props: CardProps) => CardProps);

export interface TreeViewportProps {
  ariaLabel?: string;
  className?: string;
  defaultViewport?: Partial<TreeViewport>;
  defaultZoom?: number;
  interactionMode?: TreeInteractionMode;
  maxZoom?: number;
  minZoom?: number;
  onViewportChange?: (viewport: TreeViewport) => void;
  onZoomChange?: (zoom: number) => void;
  style?: CSSProperties;
  theme?: TreeStylePreset;
  treeApiRef?: Ref<TreeApi>;
  viewport?: TreeViewport;
  zoom?: number;
}

export interface TreeCardRootProps extends HTMLAttributes<HTMLElement> {
  className?: string;
  style?: CSSProperties;
  "data-focused"?: string;
  "data-person-id"?: string;
  "data-selected"?: string;
  "data-tree-card"?: string;
}

export type TreeCardComponent<CardProps> = ComponentType<CardProps>;

export type TreeRenderCard<Person, CardProps> = (person: Person, props: CardProps) => JSX.Element;
