import {
  mkdirSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';

/** @typedef {{ type: string, name: string, children?: unknown[], content?: unknown }} TreeNode */

/**
 * 按配置树在用户目录下创建目录/缺省文件（已存在文件不覆盖）。
 *
 * @param {string} parentAbs
 * @param {TreeNode} node
 */
export const applyTreeNode = (parentAbs, node) => {
  if (!node?.type || !node?.name) {
    throw new Error('配置节点缺少 type 或 name');
  }

  const abs = join(parentAbs, node.name);

  if (node.type === 'dir') {
    mkdirSync(abs, { recursive: true });
    const children = node.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        applyTreeNode(abs, /** @type {TreeNode} */ (child));
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
