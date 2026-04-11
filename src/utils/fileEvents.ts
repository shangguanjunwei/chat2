import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  appendFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { FilePathEnum } from '@config/ts/file-path-enum';
import { homedir } from 'node:os';

/** 当前用户主目录，用于解析 `USER_LOCAL_*` 等配置路径。 */
export const USER_HOME_PATH = homedir();
/** 进程当前工作目录，用于非 `USER_LOCAL_*` 的相对路径前缀。 */
export const BASE_PATH = process.cwd();

/** 在 `~/.chat-code-bridge/<dirname>` 下创建目录（若不存在），并返回绝对路径。 */
export const createDirectory = (dirname: string) => {
  const dir = join(USER_HOME_PATH, '.chat-code-bridge', dirname);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/** 读取文本文件；文件不存在时返回 `null`。 */
const readFileContent = (filePath: string): string | null => {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');

};

/** 写入文本文件；父目录不存在时递归创建。 */
const writeFileContent = (filePath: string, content: string): void => {
  const dirPath = dirname(filePath);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  writeFileSync(filePath, content, 'utf8');
};

/** 读取 JSON 文件并 `JSON.parse`；文件不存在或为空时返回 `null`。 */
export const readFileContentAsJson = (filePath: string): any => {
  const content = readFileContent(filePath);
  if (!content) return null;
  return JSON.parse(content);
};

/** 将对象格式化为带缩进的 JSON 并写入文件（末尾补换行）。 */
export const writeFileContentAsJson = (filePath: string, content: any): void => {
  writeFileContent(filePath, `${JSON.stringify(content || '', null, 2)}\n`);
};

/** 向文件末尾追加一行内容（不存在则创建父目录）。 */
export const appendFileContent = (filePath: string, content: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(filePath, content + '\n', 'utf8');
};

/**
 * 按 `TreeNode` 树在用户目录下创建子目录与 JSON 文件（已存在文件不覆盖内容逻辑由调用方保证）。
 *
 * @param parentAbs 父目录绝对路径
 * @param node 当前节点（目录或文件）
 */
export const applyTreeNode = (parentAbs: string, node: TreeNode) => {
  const abs = join(parentAbs, node.name);
  if (node.type === 'dir') {
    mkdirSync(abs, { recursive: true });
    const children = node.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        applyTreeNode(abs, child);
      }
    }
    return;
  }
  if (node.type === 'file') {
    mkdirSync(dirname(abs), { recursive: true });
    const { content } = node;
    writeFileContentAsJson(abs, content);
  }
};

/** 若路径存在则删除该文件。 */
export const deleteFile = (filePath: string): void => {
  if (existsSync(filePath)) unlinkSync(filePath);
};

/**
 * 将 `FilePathEnum` 键解析为绝对路径：`USER_LOCAL_*` 前缀项基于用户主目录，否则基于 `process.cwd()`。
 */
export const getFilePath = (key: keyof typeof FilePathEnum) => {
  const prefix = key.toString().startsWith('USER_LOCAL_') ? USER_HOME_PATH : BASE_PATH;
  return join(prefix, FilePathEnum[key]);
};

