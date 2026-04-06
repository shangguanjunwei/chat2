import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const sessionDir = join(homedir(), '.chat-code-bridge');
const sessionPath = join(sessionDir, 'cursor-agent-session.json');

function getWorkspace() {
  return resolve(process.env.CURSOR_AGENT_WORKSPACE || process.cwd());
}

function readSession() {
  try {
    const row = JSON.parse(readFileSync(sessionPath, 'utf8'));
    if (row?.chatId && typeof row.workspace === 'string') return row;
  } catch {
    // 文件不存在或内容无效
  }
  return null;
}

function writeSession(workspace, chatId) {
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(
    sessionPath,
    `${JSON.stringify({ workspace, chatId }, null, 2)}\n`,
    'utf8',
  );
}

function getAgentBin() {
  return process.env.CURSOR_AGENT_BIN || 'agent';
}

function runAgent(workspace, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(getAgentBin(), args, {
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
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout);
      else
        reject(
          new Error(stderr.trim() || stdout.trim() || `agent 退出码 ${code}`),
        );
    });
  });
}

let gate = Promise.resolve();

async function sendMessageToCursorImpl(message) {
  const workspace = getWorkspace();
  const session = readSession();
  let chatId =
    session && session.workspace === workspace ? session.chatId : null;

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

/**
 * 通过本机 Cursor Agent CLI（`agent`）发送一条用户消息，并在同一工作区内复用固定会话。
 * 会话 id 持久化在 ~/.chat-code-bridge/cursor-agent-session.json。
 *
 * 环境变量：
 * - CURSOR_AGENT_WORKSPACE：工作区目录（默认 process.cwd()）
 * - CURSOR_AGENT_BIN：`agent` 可执行文件路径（默认在 PATH 中查找）
 *
 * @param {string} text
 * @returns {Promise<{ text: string, chatId: string }>}
 */
export async function sendMessageToCursor(text) {
  const message = String(text ?? '').trim();
  if (!message) throw new Error('发送 Cursor 的消息不能为空');
  const done = gate.then(() => sendMessageToCursorImpl(message));
  gate = done.catch(() => { });
  return done;
}
