import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 从当前包或上级目录定位 `package.json` 并解析；找不到则返回占位字段。 */
function readPackageJson(): PackageJson {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, '..', 'package.json'), join(here, '..', '..', 'package.json')];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as PackageJson;
    }
  }
  return { version: '0.0.0', name: '', author: '', homepage: '', dependencies: {} } as PackageJson;
}

const pkg = readPackageJson();

const INNER_WIDTH = 60;

const ANSI_RESET = '\x1b[0m';

/** 命名颜色 → SGR 前景色（默认未列出的名称会回退为 yellow） */
const NAMED_COLORS: Record<string, string> = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

/** 将颜色名或已是 ANSI 前缀的字符串规范为可用的 SGR 前景色序列。 */
function resolveAnsiForeground(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith('\x1b') || trimmed.startsWith('\u001b')) {
    return trimmed;
  }
  return NAMED_COLORS[trimmed] ?? NAMED_COLORS.yellow;
}

/** 生成 Logo 边框内一行：左侧标签 + 右侧版本等，中间空格填充至固定宽度。 */
function boxRow(left: string, right = ''): string {
  const gap = INNER_WIDTH - left.length - right.length;
  const space = Math.max(1, gap);
  return `  │ ${left}${' '.repeat(space)}${right} │`;
}

export type DrawLogoColor = keyof typeof NAMED_COLORS | (string & {});

/**
 * 在标准输出打印项目启动 Logo（含名称、版本与简介）。
 * @param color 终端前景色：内置名称（如 `yellow`、`cyan`）或完整 ANSI SGR 前缀（如 `\x1b[35m`）。默认 `yellow`。
 */
export function drawLogo(color: DrawLogoColor = 'yellow'): void {
  const open = resolveAnsiForeground(color);
  const bar = '─'.repeat(INNER_WIDTH + 2);
  process.stdout.write('\x1b[2J\x1b[0f');
  const lines = [
    '',
    '',
    `  ┌${bar}┐`,
    boxRow(pkg.name, `v${pkg.version}`),
    boxRow('author:', pkg.author),
    boxRow('', pkg.homepage),
    boxRow('', ''),
    boxRow('- Other Recommendations packages:', ''),
    boxRow('└ @amoayun/monaco-editor-vue3', ''),
    boxRow('└ ...', ''),
    `  └${bar}┘`,
    '',
    '',
  ];

  for (const item of lines) {
    console.log(`${open}${item}${ANSI_RESET}`);
  }
}
