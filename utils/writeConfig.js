import { writeFileSync } from 'node:fs';
import { readCofig } from './readCofig.js';
import { getUserBridgeConfigPath } from './getUserBridgeConfigPath.js';

const setByDotPath = (obj, dotPath, value) => {
  const parts = dotPath.split('.').filter(Boolean);
  if (parts.length === 0) {
    throw new Error('点路径不能为空');
  }
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    if (next === undefined || next === null || typeof next !== 'object' || Array.isArray(next)) {
      cur[key] = {};
    }
    cur = /** @type {Record<string, unknown>} */ (cur[key]);
  }
  cur[parts[parts.length - 1]] = value;
};

/** 合并写入用户目录下 `chat-code-bridge.json`；键为点路径（如 `chatApp.feishu.appId`）。 */
export const writeConfig = (partial) => {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
    throw new Error('入参应为普通对象');
  }
  const data = readCofig();
  for (const [dotPath, value] of Object.entries(partial)) {
    setByDotPath(data, dotPath, value);
  }
  const filePath = getUserBridgeConfigPath();
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
