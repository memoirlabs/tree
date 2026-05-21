import type { BundledTheme } from 'shiki';

/**
 * Single source of truth for syntax highlighting on this site.
 *
 * - `theme`     - any built-in Shiki theme name (e.g. 'github-dark', 'one-dark-pro',
 *                 'vitesse-dark', 'min-dark', 'nord', 'dracula').
 * - `background`- box background applied via CSS replacement; pass through to the
 *                 `.code-block` / docs `pre` styling.
 * - `replacements` - color overrides applied via Shiki's `colorReplacements`.
 *                 Keys are the theme's original colors; values are the colors to
 *                 render instead. Edit this map to recolor the site.
 *
 * To change the look:
 * 1. Swap `theme` to another bundled Shiki theme, OR
 * 2. Add/adjust entries in `replacements`.
 */
export const syntaxTheme: {
  theme: BundledTheme;
  background: string;
  replacements: Record<string, string>;
} = {
  theme: 'github-dark',
  background: '#0c0c0c',
  replacements: {
    '#0d1117': '#0c0c0c',
    '#c9d1d9': '#fffdf4',
    '#ff7b72': '#e8240c',
    '#ffa657': '#e8240c',
    '#d2a8ff': '#1a3ec4',
    '#79c0ff': '#1a3ec4',
    '#7ee787': '#1a3ec4',
    '#a5d6ff': '#ffe600',
    '#56d4dd': '#ffe600',
    '#8b949e': '#7a766c',
  },
};
