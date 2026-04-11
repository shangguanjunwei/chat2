import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const root = path.dirname(fileURLToPath(import.meta.url));
const pkg: PackageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

export default defineConfig({
  entry: ['bin/cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  /** esbuild 压缩；发布产物后续还会经 scripts/obfuscate-dist.mjs 混淆 */
  minify: true,
  /** 混淆后与源码无法一一对应，关闭 map 避免误导 */
  sourcemap: false,
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
