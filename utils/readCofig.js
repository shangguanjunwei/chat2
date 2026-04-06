import { readFileSync } from 'node:fs';
import { getUserBridgeConfigPath } from './getUserBridgeConfigPath.js';

/**
 * 读取用户主目录中的 chat-code-bridge 配置文件并解析为对象。
 * @returns {Record<string, unknown>}
 */
export const readCofig = () => {
  const filePath = getUserBridgeConfigPath();
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};
