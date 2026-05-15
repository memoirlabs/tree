import type { FamilyTreeConnectorConfig, FamilyTreeConnectorOverrides, FamilyTreePresetName } from "./types";

const baseStatusColors = {
  linked: "bg-stroke-default",
  invite_pending: "bg-stroke-default",
  manual: "bg-stroke-default",
  default: "bg-stroke-default",
};

const defaultPreset: FamilyTreeConnectorConfig = {
  statusColors: baseStatusColors,
  coupleLine: {
    thickness: "h-px",
    colorClass: "bg-stroke-default",
  },
  trunk: {
    thickness: "w-px",
    colorClass: "bg-stroke-default",
  },
  siblingBus: {
    thickness: "h-px",
    colorClass: "bg-stroke-default",
  },
  drop: {
    thickness: "w-px",
    colorClass: "bg-stroke-default",
  },
  anchors: {
    coupleInsetPx: 0,
    verticalGapPx: 24,
  },
};

const compactPreset: FamilyTreeConnectorConfig = {
  ...defaultPreset,
  coupleLine: {
    ...defaultPreset.coupleLine,
    thickness: "h-[2px]",
  },
  trunk: {
    ...defaultPreset.trunk,
    thickness: "w-[2px]",
  },
  siblingBus: {
    ...defaultPreset.siblingBus,
    thickness: "h-[2px]",
  },
  drop: {
    ...defaultPreset.drop,
    thickness: "w-[2px]",
  },
  anchors: {
    ...defaultPreset.anchors,
    verticalGapPx: 20,
  },
};

const contrastPreset: FamilyTreeConnectorConfig = {
  ...defaultPreset,
  statusColors: {
    linked: "bg-copy-primary",
    invite_pending: "bg-amber-500",
    manual: "bg-stroke-default",
    default: "bg-copy-primary",
  },
  coupleLine: {
    ...defaultPreset.coupleLine,
    colorClass: "bg-copy-primary",
    thickness: "h-[2px]",
  },
  trunk: {
    ...defaultPreset.trunk,
    colorClass: "bg-copy-primary",
    thickness: "w-[2px]",
  },
  siblingBus: {
    ...defaultPreset.siblingBus,
    colorClass: "bg-copy-primary",
    thickness: "h-[2px]",
  },
  drop: {
    ...defaultPreset.drop,
    colorClass: "bg-copy-primary",
    thickness: "w-[2px]",
  },
};

const withoutUndefined = <T extends object>(value: T | undefined): Partial<T> => {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as Partial<T>;
};

/**
 * Built-in connector presets keyed by `FamilyTreePresetName`.
 */
export const familyTreePresets: Record<FamilyTreePresetName, FamilyTreeConnectorConfig> = {
  default: defaultPreset,
  compact: compactPreset,
  contrast: contrastPreset,
};

/**
 * Merge a preset with optional overrides to produce a connector config.
 */
export function getFamilyTreeConfig(
  preset: FamilyTreePresetName = "default",
  override?: FamilyTreeConnectorOverrides,
): FamilyTreeConnectorConfig {
  const base = familyTreePresets[preset] ?? familyTreePresets.default;
  return {
    ...base,
    ...override,
    statusColors: {
      ...base.statusColors,
      ...withoutUndefined(override?.statusColors),
    },
    coupleLine: {
      ...base.coupleLine,
      ...withoutUndefined(override?.coupleLine),
    },
    trunk: {
      ...base.trunk,
      ...withoutUndefined(override?.trunk),
    },
    siblingBus: {
      ...base.siblingBus,
      ...withoutUndefined(override?.siblingBus),
    },
    drop: {
      ...base.drop,
      ...withoutUndefined(override?.drop),
    },
    anchors: {
      ...base.anchors,
      ...withoutUndefined(override?.anchors),
    },
  };
}
