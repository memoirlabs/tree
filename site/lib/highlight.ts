import { codeToHtml } from 'shiki';
import { syntaxTheme } from './syntax-theme';

export async function highlightTsx(code: string): Promise<string> {
  return codeToHtml(code, {
    lang: 'tsx',
    theme: syntaxTheme.theme,
    colorReplacements: syntaxTheme.replacements,
  });
}
