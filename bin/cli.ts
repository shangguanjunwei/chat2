import { spawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawLogo } from '@/utils/draw';
import { getFilePath } from '@/utils/fileEvents';
import {
  prepareBridgeOptions,
  persistDaemonTargets,
  runDaemonServices,
} from '@/coreSystem';

/** 子进程仅通过该环境变量识别为守护模式（不通过额外命令行参数）。 */
const CHILD_ENV_KEY = 'CHAT_CODE_BRIDGE_CHILD';
const CHILD_ENV_VALUE = '1';

function isChildProcess(): boolean {
  return process.env[CHILD_ENV_KEY] === CHILD_ENV_VALUE;
}

/**
 * 判断守护进程是否仍在运行：存在 PID 文件且 `kill(pid, 0)` 成功。
 * 若 PID 已失效则删除陈旧文件并返回 false。
 */
function isDaemonRunning(): boolean {
  const pidPath = getFilePath('USER_LOCAL_DAEMON_PID');
  if (!existsSync(pidPath)) return false;
  const raw = readFileSync(pidPath, 'utf8').trim();
  const pid = Number.parseInt(raw, 10);
  if (!Number.isFinite(pid) || pid <= 0) {
    try {
      unlinkSync(pidPath);
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ESRCH') {
      try {
        unlinkSync(pidPath);
      } catch {
        /* ignore */
      }
    }
    return false;
  }
}

function printHelp(): void {
  console.log(`chat-code-bridge — IM（飞书/Lark/企微）与 Cursor Agent 桥接

用法:
  chat-code-bridge              启动（向导/多选后于后台运行）
  chat-code-bridge start        同上
  chat-code-bridge stop         停止后台守护进程
  chat-code-bridge reload       重启后台守护进程
  chat-code-bridge -h | --help  显示本帮助

说明:
  启动后当前终端可关闭；进程 PID 写入 ~/.chat-code-bridge/.run/daemon.pid
`);
}

/** 尝试结束守护进程并删除 PID 文件；verbose 为 false 时静默（用于 reload）。 */
function tryKillDaemon(verbose: boolean): void {
  const pidPath = getFilePath('USER_LOCAL_DAEMON_PID');
  if (!existsSync(pidPath)) {
    if (verbose) {
      console.log('未找到后台守护进程 PID 文件（可能未启动或已停止）。');
    }
    return;
  }
  const raw = readFileSync(pidPath, 'utf8').trim();
  const pid = Number.parseInt(raw, 10);
  if (!Number.isFinite(pid) || pid <= 0) {
    if (verbose) console.error('PID 文件内容无效，已清理。');
    try {
      unlinkSync(pidPath);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
    if (verbose) console.log(`已向后台进程发送 SIGTERM（PID ${pid}）。`);
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ESRCH') {
      if (verbose) console.log('该进程已不存在，清理 PID 文件。');
    } else {
      console.error(err);
      process.exit(1);
    }
  }
  try {
    unlinkSync(pidPath);
  } catch {
    /* ignore */
  }
}

function runStop(): void {
  tryKillDaemon(true);
}

type StartIntent = 'start' | 'reload';

/**
 * 开发模式下通过 `tsx` 拉起子进程时，tsx 会再 spawn 一层 Node 执行用户脚本，
 * 外层 `ChildProcess.pid` 与内层 `process.pid`（写入 daemon.pid）不一致。
 * 以 PID 文件为准，与 `stop` / `isDaemonRunning` 一致。
 */
async function readDaemonPidFromFile(
  timeoutMs = 3000,
  intervalMs = 25,
): Promise<number | undefined> {
  const pidPath = getFilePath('USER_LOCAL_DAEMON_PID');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(pidPath)) {
      const raw = readFileSync(pidPath, 'utf8').trim();
      const pid = Number.parseInt(raw, 10);
      if (Number.isFinite(pid) && pid > 0) return pid;
    }
    await new Promise<void>((r) => setTimeout(r, intervalMs));
  }
  return undefined;
}

async function runCliStart(intent: StartIntent = 'start'): Promise<void> {
  if (isDaemonRunning()) {
    const action = intent === 'reload' ? '重启' : '启动';
    console.log(
      `已有后台服务在运行（见 ~/.chat-code-bridge/daemon.pid）。\n请先关闭后再${action}：\n  chat-code-bridge stop\n`,
    );
    process.exit(1);
  }
  drawLogo();
  const bridgeOptions = await prepareBridgeOptions();
  persistDaemonTargets(bridgeOptions);

  const child = spawnDaemonChild();
  const pidFromFile = await readDaemonPidFromFile();
  const pidToShow = pidFromFile ?? child.pid;
  if (pidToShow !== undefined) {
    console.log(`后台已启动（PID ${pidToShow}）。可关闭本终端；停止请执行：chat-code-bridge stop`);
  }
}

function spawnDaemonChild() {
  const selfPath = fileURLToPath(import.meta.url);
  const tsxCli = resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  if (selfPath.endsWith('.ts') && !existsSync(tsxCli)) {
    console.error('未找到 node_modules/tsx：请在项目根目录执行，或先 npm run build 后使用 node dist/cli.js');
    process.exit(1);
  }
  const env = { ...process.env, [CHILD_ENV_KEY]: CHILD_ENV_VALUE };
  const child =
    selfPath.endsWith('.ts') && existsSync(tsxCli)
      ? spawn(process.execPath, [tsxCli, selfPath], {
        env,
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd(),
      })
      : spawn(process.execPath, [selfPath], {
        env,
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd(),
      });
  child.unref();
  return child;
}

/**
 * CLI 与 `tsx main.ts` 开发入口共用。
 */
export async function run(): Promise<void> {
  if (isChildProcess()) {
    await runDaemonServices();
    return;
  }

  const args = process.argv.slice(2);
  if (args.some((a) => a === '-h' || a === '--help')) {
    printHelp();
    process.exit(0);
  }

  const cmd = args[0];
  if (!cmd || cmd === 'start') {
    await runCliStart('start');
    process.exit(0);
  }
  if (cmd === 'stop') {
    runStop();
    process.exit(0);
  }
  if (cmd === 'reload') {
    await runCliStart('reload');
    process.exit(0);
  }

  console.error(`未知命令: ${cmd}\n`);
  printHelp();
  process.exit(1);
}

/**
 * 判断当前文件是否作为进程入口执行（npm 全局 bin 常为指向 `dist/cli.js` 的 symlink，
 * `argv[1]` 与 `import.meta.url` 字面路径可能不一致，需 `realpath` 后再比较）。
 */
const isMainModule = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      realpathSync(resolve(entry)) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();

if (isMainModule) {
  run().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
