import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const sessionDir = join(homedir(), '.chat-code-bridge');
const sessionPath = join(sessionDir, 'cursor-agent-session.json');

function readSession() {
  try {
    const row = JSON.parse(readFileSync(sessionPath, 'utf8'));
    if (row?.chatId && typeof row.workspace === 'string') return row;
  } catch {
    /* ignore */
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

function runAgent(workspace, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.env.CURSOR_AGENT_BIN || 'agent', args, {
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
  const workspace = resolve(process.env.CURSOR_AGENT_WORKSPACE || process.cwd());
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

/** Cursor Agent CLI（`CURSOR_AGENT_BIN`，默认 `agent`）发消息；会话见 `~/.chat-code-bridge/cursor-agent-session.json`。 */
export async function sendMessageToCursor(text) {
  const message = String(text ?? '').trim();
  if (!message) throw new Error('发送 Cursor 的消息不能为空');
  const done = gate.then(() => sendMessageToCursorImpl(message));
  gate = done.catch(() => { });
  return done;
}
