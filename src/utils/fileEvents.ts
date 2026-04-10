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

export const USER_HOME_PATH = homedir();
export const BASE_PATH = process.cwd();

// 创建用户目录
export const createDirectory = (dirname: string) => {
  const dir = join(USER_HOME_PATH, dirname);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// 读取文件内容
const readFileContent = (filePath: string): string | null => {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');

};

// 写入文件内容，如果写入的文件及目录不存在，则创建
const writeFileContent = (filePath: string, content: string): void => {
  const dirPath = dirname(filePath);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  writeFileSync(filePath, content, 'utf8');
};

// 读取文件内容并解析为 JSON
export const readFileContentAsJson = (filePath: string): any => {
  const content = readFileContent(filePath);
  if (!content) return null;
  return JSON.parse(content);
};

// 写入JSON文件内容
export const writeFileContentAsJson = (filePath: string, content: any): void => {
  writeFileContent(filePath, `${JSON.stringify(content || '', null, 2)}\n`);
};

// 给文件追加内容
export const appendFileContent = (filePath: string, content: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(filePath, content + '\n', 'utf8');
};

// 按配置树在用户目录创建目录与缺省文件（已存在文件不覆盖）。
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

// 删除文件
export const deleteFile = (filePath: string): void => {
  if (existsSync(filePath)) unlinkSync(filePath);
};

// 获取文件路径
export const getFilePath = (key: keyof typeof FilePathEnum) => {
  const prefix = key.toString().startsWith('USER_LOCAL_') ? USER_HOME_PATH : BASE_PATH;
  return join(prefix, FilePathEnum[key]);
};

