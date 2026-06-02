import type { ComponentType, CSSProperties, HTMLAttributes, JSX, Ref } from "react";
import type {
  PeopleById,
  PersonId,
  TreeApi,
  TreeInitialViewport,
  TreeCardProps,
  TreeCardSize,
  TreeInteractionMode,
  TreeLayoutCardBase,
  TreeLayoutEdge,
  TreePersonHandler,
  TreeSpacing,
  TreeStylePreset,
  TreeViewport,
  TreeLineShape,
} from "../core";

export type {
  PeopleById,
  PersonId,
  TreeApi,
  TreeInitialViewport,
  TreeInteractionMode,
  TreeLineShape,
  TreeStylePreset,
  TreeViewport,
} from "../core";

export type OrgReportingRelation = "manager" | "direct" | "unknown";
export type OrgReportingStatus = "current" | "former" | "unknown";

export interface OrgReportingRelationship {
  id?: string;
  type: "reporting";
  managerId: PersonId;
  reportIds: PersonId[];
  relation?: OrgReportingRelation;
  status?: OrgReportingStatus;
  order?: number;
}

export interface OrgCardProps<Person> extends HTMLAttributes<HTMLElement> {
  person: Person;
  personId: PersonId;
  depth: number;
  parentId?: PersonId;
  selected: boolean;
  focused: boolean;
  collapsed: boolean;
  readOnly: boolean;
  className?: string;
  style?: CSSProperties;
  "data-depth"?: number;
  "data-focused"?: string;
  "data-org-card"?: string;
  "data-parent-id"?: string;
  "data-person-id"?: string;
  "data-selected"?: string;
  "data-tree-card"?: string;
}

export interface OrgRenderCardProps<Person> {
  person: Person;
  personId: PersonId;
  depth: number;
  parentId?: PersonId;
  selected: boolean;
  focused: boolean;
  collapsed: boolean;
  readOnly: boolean;
  rootProps: HTMLAttributes<HTMLElement> & {
    className?: string;
    style?: CSSProperties;
    "data-depth"?: number;
    "data-focused"?: string;
    "data-org-card"?: string;
    "data-parent-id"?: string;
    "data-person-id"?: string;
    "data-selected"?: string;
    "data-tree-card"?: string;
  };
}

export type OrgChartSpacing = TreeSpacing;

export type OrgChartSize = TreeCardSize;

export type OrgChartPersonHandler<Person> = TreePersonHandler<Person>;

export type OrgChartCardProps<Person, CardExtraProps extends object> = TreeCardProps<
  Person,
  OrgCardProps<Person> & CardExtraProps
>;

export interface OrgChartProps<Person, CardExtraProps extends object = Record<string, never>> {
  root: PersonId;
  people: PeopleById<Person>;
  relationships: OrgReportingRelationship[];
  ariaLabel?: string;
  card?: ComponentType<OrgCardProps<Person> & CardExtraProps>;
  cardProps?: CardExtraProps | ((person: Person, props: OrgCardProps<Person>) => CardExtraProps);
  renderCard?: (props: OrgRenderCardProps<Person>) => JSX.Element;
  className?: string;
  style?: CSSProperties;
  cardClassName?: string;
  edgeClassName?: string;
  interactionMode?: TreeInteractionMode;
  lineShape?: TreeLineShape;
  viewport?: TreeViewport;
  defaultViewport?: Partial<TreeViewport>;
  initialViewport?: TreeInitialViewport;
  onViewportChange?: (viewport: TreeViewport) => void;
  spacing?: Partial<OrgChartSpacing>;
  maxDepth?: number | null;
  theme?: TreeStylePreset;
  treeApiRef?: Ref<TreeApi>;
  getPersonLabel?: (person: Person, personId: PersonId) => string;
  selected?: PersonId;
  collapsed?: PersonId[];
  readOnly?: boolean;
  onPersonClick?: OrgChartPersonHandler<Person>;
}

export interface OrgChartLayoutCard<Person> extends TreeLayoutCardBase<Person> {
  depth: number;
  parentId?: PersonId;
}

export type OrgChartLayoutEdge = TreeLayoutEdge;

export interface OrgChartLayoutResult<Person> {
  cards: OrgChartLayoutCard<Person>[];
  edges: OrgChartLayoutEdge[];
  bounds: {
    width: number;
    height: number;
  };
}

export interface BuildOrgChartLayoutInput<Person> {
  root: PersonId;
  people: PeopleById<Person>;
  relationships: OrgReportingRelationship[];
  collapsed?: PersonId[];
  measurements?: Record<PersonId, TreeCardSize>;
  spacing?: Partial<OrgChartSpacing>;
  maxDepth?: number | null;
  lineShape?: TreeLineShape;
}
