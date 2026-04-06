import { readFileSync } from 'node:fs';
import { getUserBridgeConfigPath } from './getUserBridgeConfigPath.js';

/** @returns {Record<string, unknown>} */
export const readCofig = () => {
  const filePath = getUserBridgeConfigPath();
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};
