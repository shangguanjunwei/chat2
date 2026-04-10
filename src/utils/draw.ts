import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function readPackageJson(): { version: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, '..', 'package.json'), join(here, '..', '..', 'package.json')];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as { version: string };
    }
  }
  return { version: '0.0.0' };
}

const pkg = readPackageJson();

const INNER_WIDTH = 50;

function boxRow(left: string, right = ''): string {
  const gap = INNER_WIDTH - left.length - right.length;
  const space = Math.max(1, gap);
  return `  │ ${left}${' '.repeat(space)}${right} │`;
}

/** 在标准输出打印项目启动 Logo（含名称、版本与简介） */
export function drawLogo(): void {
  const version = `v${pkg.version}`;
  const tagline = '@amoayun/chat-code-bridge';
  const bar = '─'.repeat(INNER_WIDTH + 2);
  console.log(`  ┌${bar}┐`);
  console.log(boxRow('chat-code-bridge', version));
  console.log(boxRow('', tagline));
  console.log(boxRow('', 'shangguan'));
  console.log(`  └${bar}┘`);
  console.log('');
}
