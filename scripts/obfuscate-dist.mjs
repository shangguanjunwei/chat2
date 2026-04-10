/**
 * 在 tsup 压缩（minify）之后对 dist/cli.js 做二次混淆。
 * 保留首行 shebang，避免破坏全局安装后的可执行文件。
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(root, 'dist', 'cli.js');

let code = readFileSync(cliPath, 'utf8');

let shebang = '';
if (code.startsWith('#!')) {
  const nl = code.indexOf('\n');
  shebang = code.slice(0, nl + 1);
  code = code.slice(nl + 1);
}

const result = JavaScriptObfuscator.obfuscate(code, {
  compact: true,
  target: 'node',
  // 偏保守，降低与 ESM / Node API 不兼容的概率
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
});

writeFileSync(cliPath, shebang + result.getObfuscatedCode());

const mapPath = `${cliPath}.map`;
if (existsSync(mapPath)) {
  unlinkSync(mapPath);
}
