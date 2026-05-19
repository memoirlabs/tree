import type { CSSProperties } from "react";

export type TreeStylePreset = "memoir" | "system";
export type TreeLineShape = "orthogonal" | "curved";

export interface TreeTheme {
  surfaceBackground?: string;
  surfaceForeground?: string;
  surfaceBorder?: string;
  canvasBackground?: string;
  cardBackground?: string;
  cardForeground?: string;
  cardBorder?: string;
  cardSelectedBackground?: string;
  cardSelectedForeground?: string;
  cardSelectedBorder?: string;
  cardShadow?: string;
  edge?: string;
  accent?: string;
  mutedForeground?: string;
  profileBackground?: string;
  surfaceRadius?: CSSProperties["borderRadius"];
  cardRadius?: CSSProperties["borderRadius"];
  profileRadius?: CSSProperties["borderRadius"];
  outlineWidth?: CSSProperties["borderWidth"];
  fontFamily?: CSSProperties["fontFamily"];
}

type TreeThemeVars = CSSProperties & Record<`--tree-${string}`, string | number | undefined>;

const memoirTheme: TreeTheme = {
  surfaceBackground: "#fafafa",
  surfaceForeground: "#030201",
  surfaceBorder: "#030201",
  canvasBackground: "#F4EFDC",
  cardBackground: "#fafafa",
  cardForeground: "#030201",
  cardBorder: "#030201",
  cardSelectedBackground: "#EC5A44",
  cardSelectedForeground: "#030201",
  cardSelectedBorder: "#030201",
  cardShadow: "4px 4px 0 #030201",
  edge: "#030201",
  accent: "#EC5A44",
  mutedForeground: "#3b342e",
  profileBackground: "#F4EFDC",
  surfaceRadius: 0,
  cardRadius: 0,
  profileRadius: 0,
  outlineWidth: "1px",
};

const systemTheme: TreeTheme = {
  surfaceBackground: "Canvas",
  surfaceForeground: "CanvasText",
  surfaceBorder: "color-mix(in srgb, CanvasText 14%, transparent)",
  canvasBackground: "transparent",
  cardBackground: "color-mix(in srgb, Canvas 96%, CanvasText 4%)",
  cardForeground: "CanvasText",
  cardBorder: "color-mix(in srgb, CanvasText 16%, transparent)",
  cardSelectedBorder: "color-mix(in srgb, CanvasText 54%, transparent)",
  edge: "color-mix(in srgb, CanvasText 34%, transparent)",
  mutedForeground: "color-mix(in srgb, CanvasText 68%, transparent)",
  profileBackground: "color-mix(in srgb, CanvasText 10%, transparent)",
  surfaceRadius: 8,
  cardRadius: 8,
  profileRadius: 8,
  outlineWidth: "1px",
};

export function resolveTreeTheme(theme: TreeStylePreset | TreeTheme | undefined): TreeTheme {
  if (theme === "system") return systemTheme;
  if (theme === "memoir" || theme === undefined) return memoirTheme;
  return theme;
}

export function getTreeStyleName(theme: TreeStylePreset | TreeTheme | undefined): TreeStylePreset | "custom" {
  if (theme === undefined) return "memoir";
  return typeof theme === "string" ? theme : "custom";
}

export function createTreeThemeStyle(theme: TreeStylePreset | TreeTheme | undefined): TreeThemeVars {
  const resolvedTheme = resolveTreeTheme(theme);

  return {
    "--tree-surface-bg": resolvedTheme.surfaceBackground,
    "--tree-surface-fg": resolvedTheme.surfaceForeground,
    "--tree-surface-border": resolvedTheme.surfaceBorder,
    "--tree-canvas-bg": resolvedTheme.canvasBackground,
    "--tree-card-bg": resolvedTheme.cardBackground,
    "--tree-card-fg": resolvedTheme.cardForeground,
    "--tree-card-border": resolvedTheme.cardBorder,
    "--tree-card-selected-bg": resolvedTheme.cardSelectedBackground,
    "--tree-card-selected-fg": resolvedTheme.cardSelectedForeground,
    "--tree-card-selected-border": resolvedTheme.cardSelectedBorder,
    "--tree-card-shadow": resolvedTheme.cardShadow,
    "--tree-edge": resolvedTheme.edge,
    "--tree-accent": resolvedTheme.accent,
    "--tree-muted-fg": resolvedTheme.mutedForeground,
    "--tree-profile-bg": resolvedTheme.profileBackground,
    "--tree-surface-radius": resolvedTheme.surfaceRadius,
    "--tree-card-radius": resolvedTheme.cardRadius,
    "--tree-profile-radius": resolvedTheme.profileRadius,
    "--tree-outline-width": resolvedTheme.outlineWidth,
    "--tree-font-family": resolvedTheme.fontFamily,
  };
}
