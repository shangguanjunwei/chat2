import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { appendFileContent, USER_HOME_PATH, getFilePath, readFileContentAsJson } from '@/utils/fileEvents';
import dayjs from 'dayjs';

export const addLog = (message: string, prefix: string = '', suffix: string = '') => {
  if (typeof message !== 'string') {
    throw new TypeError('writeLog 的入参必须是 string');
  }
  const dir = join(USER_HOME_PATH, '.chat-code-bridge', 'log');
  const filePath = join(dir, `${dayjs().format('YYYY-MM-DD')}.log`);
  const content = `${prefix} ${message} ${suffix}`.trim();
  const line = `**${dayjs().format('HH:mm:ss.SSS')}** ${content}`;
  mkdirSync(dir, { recursive: true });
  appendFileContent(filePath, line);
};
