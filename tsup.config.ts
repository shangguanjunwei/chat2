import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const root = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
};

export default defineConfig({
  entry: ['bin/cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: Object.keys(pkg.dependencies ?? {}),
  esbuildOptions(options) {
    options.alias = {
      '@': path.join(root, 'src'),
      '@config': path.join(root, 'config'),
    };
  },
});
