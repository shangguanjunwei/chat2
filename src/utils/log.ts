import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { appendFileContent, USER_HOME_PATH } from '@/utils/fileEvents';
import dayjs from 'dayjs';

/**
 * 将一条日志按应用维度追加写入用户目录下按日滚动的日志文件。
 *
 * @param appId 应用/bot 标识，用于生成 `appId.log` 文件名
 * @param content 日志内容；非字符串会先 `JSON.stringify`
 */
export const addLog = (appId: string, content: string) => {
  let message = "";
  if (typeof content !== 'string') {
    message = JSON.stringify(content);
  } else {
    message = content.trim().replace(/\n+/g, '\n').replace(/\t+/g, '\t');
  }
  const dir = join(USER_HOME_PATH, '.chat-code-bridge', 'log', dayjs().format('YYYY-MM-DD'));
  const filePath = join(dir, `${appId}.log`);
  const line = `**[${dayjs().format('HH:mm:ss.SSS')}]** ${message}`;
  mkdirSync(dir, { recursive: true });
  appendFileContent(filePath, line);
};
