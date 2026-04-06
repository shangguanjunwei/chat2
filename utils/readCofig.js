import { readFileSync } from 'node:fs';
import { getUserBridgeConfigPath } from './getUserBridgeConfigPath.js';

/** 读取并解析用户目录下 `chat-code-bridge.json`。 */
export const readCofig = () => {
  const filePath = getUserBridgeConfigPath();
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};
