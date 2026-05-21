import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { syntaxTheme } from './lib/syntax-theme';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: syntaxTheme.theme, dark: syntaxTheme.theme },
      defaultColor: false,
      transformers: [
        {
          name: 'memoir-color-replacements',
          preprocess(code, options) {
            options.colorReplacements = {
              ...(options.colorReplacements ?? {}),
              ...syntaxTheme.replacements,
            };
          },
        },
      ],
    },
  },
});
