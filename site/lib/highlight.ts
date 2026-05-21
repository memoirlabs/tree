import { codeToHtml } from 'shiki';

export async function highlightTsx(code: string): Promise<string> {
  return codeToHtml(code, {
    lang: 'tsx',
    theme: 'github-dark',
    colorReplacements: {
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
  });
}
