import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageJson {
  version: string;
  name: string;
  author: string;
}

function readPackageJson(): PackageJson {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, '..', 'package.json'), join(here, '..', '..', 'package.json')];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as PackageJson;
    }
  }
  return { version: '0.0.0', name: '', author: '' };
}

const pkg = readPackageJson();

const INNER_WIDTH = 60;

function boxRow(left: string, right = ''): string {
  const gap = INNER_WIDTH - left.length - right.length;
  const space = Math.max(1, gap);
  return `  │ ${left}${' '.repeat(space)}${right} │`;
}

/** 在标准输出打印项目启动 Logo（含名称、版本与简介） */
export function drawLogo(): void {
  const bar = '─'.repeat(INNER_WIDTH + 2);
  const list = [
    `  ┌${bar}┐`,
    boxRow(pkg.name, `v${pkg.version}`),
    boxRow('author:', pkg.author),
    boxRow('', ''),
    boxRow('- Other Recommendations packages:', ''),
    boxRow('└ @amoayun/monaco-editor-vue3', ''),
    boxRow('└ ...', ''),
    `  └${bar}┘`,
  ]
  list.map(item => {
    console.log(item);
  });
}
