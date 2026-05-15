import { parse } from "yaml";

import { getFamilyTreeConfig } from "./design-presets";
import type {
  FamilyTreeCardConfig,
  FamilyTreeCardField,
  FamilyTreeConnectorConfig,
  FamilyTreeConnectorOverrides,
  FamilyTreeLayoutDensity,
  FamilyTreeLayoutStrategy,
  FamilyTreePresetName,
  FamilyTreeStatusColors,
  RelationType,
} from "./types";

export type FamilyTreeSchemaVersion = 1;

export interface FamilyTreeTreeSchema {
  title?: string;
  showTitle?: boolean;
  rootId?: string;
}

export interface FamilyTreeLayoutSchema {
  strategy?: FamilyTreeLayoutStrategy;
  density?: FamilyTreeLayoutDensity;
}

export interface FamilyTreeConnectorsSchema extends FamilyTreeConnectorOverrides {
  preset?: FamilyTreePresetName;
}

export interface FamilyTreeEditingSchema {
  enabled?: boolean;
  rootRelations?: RelationType[];
  memberRelations?: RelationType[];
}

export interface FamilyTreeSchema {
  version: FamilyTreeSchemaVersion;
  tree?: FamilyTreeTreeSchema;
  layout?: FamilyTreeLayoutSchema;
  connectors?: FamilyTreeConnectorsSchema;
  card?: FamilyTreeCardConfig;
  editing?: FamilyTreeEditingSchema;
}

export interface ResolveFamilyTreeSchemaRuntime {
  title?: string;
  showTitle?: boolean;
  canEdit?: boolean;
  designPreset?: FamilyTreePresetName;
  designOverrides?: FamilyTreeConnectorOverrides;
  cardConfig?: FamilyTreeCardConfig;
}

export interface FamilyTreeResolvedConfig {
  rootId?: string;
  title?: string;
  showTitle: boolean;
  canEdit: boolean;
  designPreset: FamilyTreePresetName;
  designOverrides?: FamilyTreeConnectorOverrides;
  connectorConfig: FamilyTreeConnectorConfig;
  layout: Required<FamilyTreeLayoutSchema>;
  cardConfig: FamilyTreeCardConfig;
  rootRelations?: RelationType[];
  memberRelations?: RelationType[];
}

export class FamilyTreeSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FamilyTreeSchemaError";
  }
}

const relationTypes = [
  "parent",
  "sibling",
  "child",
  "spouse",
  "former_spouse",
  "grandparent",
  "grandchild",
  "manager",
  "direct_report",
  "peer",
  "ceo",
  "assistant",
] as const;
const presetNames = ["default", "compact", "contrast"] as const;
const layoutStrategies = ["auto", "generation"] as const;
const layoutDensities = ["comfortable", "compact"] as const;
const cardFields = ["name", "birthday", "relation", "status"] as const;
const statusColorKeys = ["linked", "invite_pending", "manual", "default"] as const;
const statusLabelKeys = ["linked", "invite_pending", "manual"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const schemaError = (path: string, message: string): FamilyTreeSchemaError =>
  new FamilyTreeSchemaError(`${path} ${message}`);

const checkKnownKeys = (value: Record<string, unknown>, path: string, allowedKeys: readonly string[]) => {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw schemaError(`${path}.${key}`, "is not a supported schema field");
    }
  }
};

const readObject = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw schemaError(path, "must be an object");
  }
  return value;
};

const readOptionalObject = (
  source: Record<string, unknown>,
  key: string,
  path: string,
): Record<string, unknown> | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  return readObject(value, path);
};

const readOptionalString = (source: Record<string, unknown>, key: string, path: string): string | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw schemaError(path, "must be a string");
  }
  return value;
};

const readOptionalBoolean = (source: Record<string, unknown>, key: string, path: string): boolean | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw schemaError(path, "must be a boolean");
  }
  return value;
};

const readOptionalNumber = (source: Record<string, unknown>, key: string, path: string): number | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw schemaError(path, "must be a finite number");
  }
  return value;
};

const readEnum = <T extends string>(
  value: unknown,
  path: string,
  allowedValues: readonly T[],
): T => {
  if (typeof value === "string" && (allowedValues as readonly string[]).includes(value)) {
    return value as T;
  }
  throw schemaError(path, `must be one of: ${allowedValues.join(", ")}`);
};

const readOptionalEnum = <T extends string>(
  source: Record<string, unknown>,
  key: string,
  path: string,
  allowedValues: readonly T[],
): T | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  return readEnum(value, path, allowedValues);
};

const readOptionalEnumArray = <T extends string>(
  source: Record<string, unknown>,
  key: string,
  path: string,
  allowedValues: readonly T[],
): T[] | undefined => {
  const value = source[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw schemaError(path, "must be an array");
  }
  return value.map((item, index) => readEnum(item, `${path}[${index}]`, allowedValues));
};

const readTreeSchema = (value: Record<string, unknown>): FamilyTreeTreeSchema => {
  checkKnownKeys(value, "tree", ["title", "showTitle", "rootId"]);
  return {
    title: readOptionalString(value, "title", "tree.title"),
    showTitle: readOptionalBoolean(value, "showTitle", "tree.showTitle"),
    rootId: readOptionalString(value, "rootId", "tree.rootId"),
  };
};

const readLayoutSchema = (value: Record<string, unknown>): FamilyTreeLayoutSchema => {
  checkKnownKeys(value, "layout", ["strategy", "density"]);
  return {
    strategy: readOptionalEnum(value, "strategy", "layout.strategy", layoutStrategies),
    density: readOptionalEnum(value, "density", "layout.density", layoutDensities),
  };
};

const readLineStyleOverride = (value: Record<string, unknown>, path: string) => {
  checkKnownKeys(value, path, ["thickness", "colorClass"]);
  return {
    thickness: readOptionalString(value, "thickness", `${path}.thickness`),
    colorClass: readOptionalString(value, "colorClass", `${path}.colorClass`),
  };
};

const readStatusColors = (value: Record<string, unknown>): Partial<FamilyTreeStatusColors> => {
  checkKnownKeys(value, "connectors.statusColors", statusColorKeys);
  return {
    linked: readOptionalString(value, "linked", "connectors.statusColors.linked"),
    invite_pending: readOptionalString(value, "invite_pending", "connectors.statusColors.invite_pending"),
    manual: readOptionalString(value, "manual", "connectors.statusColors.manual"),
    default: readOptionalString(value, "default", "connectors.statusColors.default"),
  };
};

const readConnectorsSchema = (value: Record<string, unknown>): FamilyTreeConnectorsSchema => {
  checkKnownKeys(value, "connectors", [
    "preset",
    "statusColors",
    "coupleLine",
    "trunk",
    "siblingBus",
    "drop",
    "anchors",
  ]);
  const anchors = readOptionalObject(value, "anchors", "connectors.anchors");
  if (anchors) {
    checkKnownKeys(anchors, "connectors.anchors", ["coupleInsetPx", "verticalGapPx"]);
  }
  return {
    preset: readOptionalEnum(value, "preset", "connectors.preset", presetNames),
    statusColors: value.statusColors
      ? readStatusColors(readObject(value.statusColors, "connectors.statusColors"))
      : undefined,
    coupleLine: value.coupleLine
      ? readLineStyleOverride(readObject(value.coupleLine, "connectors.coupleLine"), "connectors.coupleLine")
      : undefined,
    trunk: value.trunk
      ? readLineStyleOverride(readObject(value.trunk, "connectors.trunk"), "connectors.trunk")
      : undefined,
    siblingBus: value.siblingBus
      ? readLineStyleOverride(readObject(value.siblingBus, "connectors.siblingBus"), "connectors.siblingBus")
      : undefined,
    drop: value.drop ? readLineStyleOverride(readObject(value.drop, "connectors.drop"), "connectors.drop") : undefined,
    anchors: anchors
      ? {
          coupleInsetPx: readOptionalNumber(anchors, "coupleInsetPx", "connectors.anchors.coupleInsetPx"),
          verticalGapPx: readOptionalNumber(anchors, "verticalGapPx", "connectors.anchors.verticalGapPx"),
        }
      : undefined,
  };
};

const readStatusLabels = (value: Record<string, unknown>): FamilyTreeCardConfig["statusLabels"] => {
  checkKnownKeys(value, "card.statusLabels", statusLabelKeys);
  return {
    linked: readOptionalString(value, "linked", "card.statusLabels.linked"),
    invite_pending: readOptionalString(value, "invite_pending", "card.statusLabels.invite_pending"),
    manual: readOptionalString(value, "manual", "card.statusLabels.manual"),
  };
};

const readCardSchema = (value: Record<string, unknown>): FamilyTreeCardConfig => {
  checkKnownKeys(value, "card", [
    "fields",
    "showRootLabel",
    "rootLabel",
    "widthClassName",
    "heightClassName",
    "className",
    "statusLabels",
  ]);
  return {
    fields: readOptionalEnumArray(value, "fields", "card.fields", cardFields) as FamilyTreeCardField[] | undefined,
    showRootLabel: readOptionalBoolean(value, "showRootLabel", "card.showRootLabel"),
    rootLabel: readOptionalString(value, "rootLabel", "card.rootLabel"),
    widthClassName: readOptionalString(value, "widthClassName", "card.widthClassName"),
    heightClassName: readOptionalString(value, "heightClassName", "card.heightClassName"),
    className: readOptionalString(value, "className", "card.className"),
    statusLabels: value.statusLabels
      ? readStatusLabels(readObject(value.statusLabels, "card.statusLabels"))
      : undefined,
  };
};

const readEditingSchema = (value: Record<string, unknown>): FamilyTreeEditingSchema => {
  checkKnownKeys(value, "editing", ["enabled", "rootRelations", "memberRelations"]);
  return {
    enabled: readOptionalBoolean(value, "enabled", "editing.enabled"),
    rootRelations: readOptionalEnumArray(value, "rootRelations", "editing.rootRelations", relationTypes),
    memberRelations: readOptionalEnumArray(value, "memberRelations", "editing.memberRelations", relationTypes),
  };
};

/**
 * Validate unknown data into a supported family tree schema.
 */
export function validateFamilyTreeSchema(input: unknown): FamilyTreeSchema {
  const root = readObject(input, "schema");
  checkKnownKeys(root, "schema", ["version", "tree", "layout", "connectors", "card", "editing"]);

  if (root.version !== 1) {
    throw schemaError("version", "must be 1");
  }

  const tree = readOptionalObject(root, "tree", "tree");
  const layout = readOptionalObject(root, "layout", "layout");
  const connectors = readOptionalObject(root, "connectors", "connectors");
  const card = readOptionalObject(root, "card", "card");
  const editing = readOptionalObject(root, "editing", "editing");

  const validatedSchema: FamilyTreeSchema = { version: 1 };
  if (tree) validatedSchema.tree = readTreeSchema(tree);
  if (layout) validatedSchema.layout = readLayoutSchema(layout);
  if (connectors) validatedSchema.connectors = readConnectorsSchema(connectors);
  if (card) validatedSchema.card = readCardSchema(card);
  if (editing) validatedSchema.editing = readEditingSchema(editing);
  return validatedSchema;
}

/**
 * Parse a YAML family tree schema and validate it before use.
 */
export function parseFamilyTreeYaml(yamlSource: string): FamilyTreeSchema {
  if (typeof yamlSource !== "string" || yamlSource.trim().length === 0) {
    throw new FamilyTreeSchemaError("schemaYaml must be a non-empty YAML string");
  }
  let parsed: unknown;
  try {
    parsed = parse(yamlSource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown parser error";
    throw new FamilyTreeSchemaError(`Unable to parse schemaYaml: ${message}`);
  }
  return validateFamilyTreeSchema(parsed);
}

const mergeConnectorOverrides = (
  schemaOverrides: FamilyTreeConnectorOverrides | undefined,
  runtimeOverrides: FamilyTreeConnectorOverrides | undefined,
): FamilyTreeConnectorOverrides | undefined => {
  if (!schemaOverrides && !runtimeOverrides) return undefined;
  return {
    ...schemaOverrides,
    ...runtimeOverrides,
    statusColors: {
      ...schemaOverrides?.statusColors,
      ...runtimeOverrides?.statusColors,
    },
    coupleLine: {
      ...schemaOverrides?.coupleLine,
      ...runtimeOverrides?.coupleLine,
    },
    trunk: {
      ...schemaOverrides?.trunk,
      ...runtimeOverrides?.trunk,
    },
    siblingBus: {
      ...schemaOverrides?.siblingBus,
      ...runtimeOverrides?.siblingBus,
    },
    drop: {
      ...schemaOverrides?.drop,
      ...runtimeOverrides?.drop,
    },
    anchors: {
      ...schemaOverrides?.anchors,
      ...runtimeOverrides?.anchors,
    },
  };
};

const toConnectorOverrides = (connectors?: FamilyTreeConnectorsSchema): FamilyTreeConnectorOverrides | undefined => {
  if (!connectors) return undefined;
  const overrides: FamilyTreeConnectorOverrides = {
    statusColors: connectors.statusColors,
    coupleLine: connectors.coupleLine,
    trunk: connectors.trunk,
    siblingBus: connectors.siblingBus,
    drop: connectors.drop,
    anchors: connectors.anchors,
  };
  return Object.values(overrides).some((value) => value !== undefined) ? overrides : undefined;
};

/**
 * Resolve schema defaults with runtime props. Runtime props win when provided.
 */
export function resolveFamilyTreeSchema(
  schema?: FamilyTreeSchema,
  runtime: ResolveFamilyTreeSchemaRuntime = {},
): FamilyTreeResolvedConfig {
  const designPreset = runtime.designPreset ?? schema?.connectors?.preset ?? "default";
  const designOverrides = mergeConnectorOverrides(toConnectorOverrides(schema?.connectors), runtime.designOverrides);
  return {
    rootId: schema?.tree?.rootId,
    title: runtime.title ?? schema?.tree?.title ?? "Family Tree",
    showTitle: runtime.showTitle ?? schema?.tree?.showTitle ?? true,
    canEdit: runtime.canEdit ?? schema?.editing?.enabled ?? false,
    designPreset,
    designOverrides,
    connectorConfig: getFamilyTreeConfig(designPreset, designOverrides),
    layout: {
      strategy: schema?.layout?.strategy ?? "generation",
      density: schema?.layout?.density ?? "comfortable",
    },
    cardConfig: {
      ...schema?.card,
      ...runtime.cardConfig,
      statusLabels: {
        ...schema?.card?.statusLabels,
        ...runtime.cardConfig?.statusLabels,
      },
    },
    rootRelations: schema?.editing?.rootRelations,
    memberRelations: schema?.editing?.memberRelations,
  };
}
