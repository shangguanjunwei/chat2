import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getDateText(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function getTimeText(date) {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  const ms = pad2(date.getMilliseconds());
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * 将日志写入 ~/.chat-code-bridge/log/YYYY-MM-DD.log
 * @param {string} message
 */
export const writeLog = (prefix, message) => {
  if (typeof message !== 'string') {
    throw new TypeError('writeLog 的入参必须是 string');
  }
  const now = new Date();
  const dir = join(homedir(), '.chat-code-bridge', 'log');
  const filePath = join(dir, `${getDateText(now)}.log`);
  const line = `【${getTimeText(now)}】${prefix}: ${message}\n`;
  mkdirSync(dir, { recursive: true });
  appendFileSync(filePath, line, 'utf8');
};
