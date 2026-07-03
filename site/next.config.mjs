import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve('..'),
    resolveAlias: {
      '@memoir/tree': '../dist/index.js',
      '@memoir/tree/styles.css': '../dist/styles.css',
    },
  },
};

export default withMDX(config);
