import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { appendFileContent, USER_HOME_PATH } from '@/utils/fileEvents';
import dayjs from 'dayjs';

export const addLog = (appId: string, content: string) => {
  let message = "";
  if (typeof content !== 'string') {
    message = JSON.stringify(content);
  } else {
    message = content.trim();
  }
  const dir = join(USER_HOME_PATH, '.chat-code-bridge', 'log', dayjs().format('YYYY-MM-DD'));
  const filePath = join(dir, `${appId}.log`);
  const line = `**${dayjs().format('HH:mm:ss.SSS')}** ${message}`;
  mkdirSync(dir, { recursive: true });
  appendFileContent(filePath, line);
};