import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { writeConfig } from './utils/writeConfig.js';
import { readCofig } from './utils/readCofig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'config', 'chat-code-bridge.json');

/**
 * @typedef {{ type: string, name: string, children?: unknown[], content?: unknown }} TreeNode
 */

/**
 * @param {string} parentAbs
 * @param {TreeNode} node
 */
const applyTreeNode = (parentAbs, node) => {
  if (!node?.type || !node?.name) {
    throw new Error('配置节点缺少 type 或 name');
  }

  const abs = join(parentAbs, node.name);

  if (node.type === 'dir') {
    mkdirSync(abs, { recursive: true });
    const children = node.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        applyTreeNode(abs, /** @type {TreeNode} */(child));
      }
    }
    return;
  }

  if (node.type === 'file') {
    if (existsSync(abs)) {
      return;
    }
    mkdirSync(dirname(abs), { recursive: true });
    let body;
    const { content } = node;
    if (content === undefined || content === null) {
      body = '';
    } else if (typeof content === 'string') {
      body = content;
    } else {
      body = `${JSON.stringify(content, null, 2)}\n`;
    }
    writeFileSync(abs, body, 'utf8');
    return;
  }

  throw new Error(`不支持的节点类型：${node.type}`);
};

const main = () => {
  const raw = readFileSync(CONFIG_PATH, 'utf8');
  const root = /** @type {TreeNode} */ (JSON.parse(raw));
  applyTreeNode(homedir(), root);
  console.log(`已按配置同步到用户主目录：${join(homedir(), root.name)}`);
};

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
