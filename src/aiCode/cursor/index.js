import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { sendTextMessage } from '../../chatApp/feishu/send-message/sendTextMessage.js';
import { deleteMessageReaction } from '../../chatApp/feishu/send-message/sendMessageReaction.js';
import { writeLog } from '../../../utils/writeLog.js';
import { sendMarkdownMessage } from '../../chatApp/feishu/send-message/sendMarkdownMessage.js';

const sessionDir = join(homedir(), '.chat-code-bridge');
const sessionPath = join(sessionDir, 'chat-code-bridge-session.json');

const readSession = () => {
  try {
    const row = JSON.parse(readFileSync(sessionPath, 'utf8'));
    if (row?.chatId && typeof row.workspace === 'string') return row;
  } catch {
    /* ignore */
  }
  return null;
}

const writeSession = (workspace, chatId) => {
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(
    sessionPath,
    `${JSON.stringify({ workspace, chatId }, null, 2)}\n`,
    'utf8',
  );
}

const runAgent = (workspace, args) => {
  return new Promise((resolve, reject) => {
    const child = spawn('agent', args, {
      cwd: workspace,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c) => {
      stdout += c;
    });
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', reject);
    child.on('close',
      (code) => {
        if (code === 0) {
          resolve(stdout);
        } else
          reject(
            new Error(stderr.trim() || stdout.trim() || `agent 退出码 ${code}`),
          );
      });
  });
}

const sendMessageToCursorImpl = async (message) => {
  const workspace = process.cwd();
  const session = readSession();
  let chatId = session && session.workspace === workspace ? session.chatId : null;

  if (!chatId) {
    chatId = (await runAgent(workspace, ['create-chat'])).trim();
    if (!chatId) throw new Error('create-chat 未返回 chat id');
    writeSession(workspace, chatId);
  }

  const out = await runAgent(workspace, [
    '--print',
    '--trust',
    '--workspace',
    workspace,
    '--resume',
    chatId,
    '--output-format',
    'text',
    message,
  ]);
  return { text: out.trim(), chatId };
}

/** Cursor Agent CLI（默认可执行名 `agent`）发消息；会话见 `~/.chat-code-bridge/chat-code-bridge-session.json`。 */
export const sendMessageToCursor = async (client, options) => {
  const message = String(options.content.text ?? '').trim();
  if (!message) throw new Error('发送 Cursor 的消息不能为空');
  const result = await sendMessageToCursorImpl(message);
  const params = {
    message_id: options.message_id,
    receive_id: options.chat_id,
    receive_id_type: 'chat_id',
    text: result.text || '',
  }
  writeLog("本地发送消息", JSON.stringify(params));
  // await sendTextMessage(client, params);
  await sendMarkdownMessage(client, params);
  if (options.reaction_id) {
    await deleteMessageReaction(client, {
      message_id: options.message_id,
      reaction_id: options.reaction_id,
    });
  }
}
