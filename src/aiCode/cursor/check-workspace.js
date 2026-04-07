import { existsSync, readFileSync } from 'node:fs';
import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';
import { readCofig } from '../../../utils/readCofig.js';
import { writeConfig } from '../../../utils/writeConfig.js';

const WORKSPACE_LIST_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../../config/project-workspace.json');

/**
 * @typedef {{ label: string, path: string }} WorkspaceEntry
 */

/** @returns {WorkspaceEntry[]} */
export const readProjectWorkspaceList = () => {
  if (!existsSync(WORKSPACE_LIST_PATH)) {
    throw new Error(`未找到配置文件：${WORKSPACE_LIST_PATH}`);
  }
  const raw = JSON.parse(readFileSync(WORKSPACE_LIST_PATH, 'utf8'));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('project-workspace.json 需为非空数组');
  }
  for (const row of raw) {
    if (!row || typeof row.key !== 'string' || typeof row.title !== 'string' || typeof row.workspace !== 'string') {
      throw new Error('每项 workspace 须包含字符串字段 key、title、workspace');
    }
  }
  return raw;
};

const selectWorkspaceByNumber = async (entries, input, output) => {
  const rl = readlinePromises.createInterface({ input, output });
  try {
    output.write('当前非交互式 TTY，请用序号选择 workspace：\n');
    entries.forEach((w, i) => {
      output.write(`  ${i + 1}. ${w.title} \n`);
    });
    const raw = await rl.question('请输入序号: ');
    const idx = Number.parseInt(String(raw).trim(), 10) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= entries.length) {
      throw new Error(`无效选项：${raw}`);
    }
    return entries[idx];
  } finally {
    rl.close();
  }
};

const selectWorkspaceInteractive = (entries, input, output) =>
  new Promise((resolve) => {
    let index = 0;
    const saved = readCofig().currentProject.workspace;
    if (typeof saved === 'string' && saved) {
      const i = entries.findIndex((e) => e.path === saved);
      if (i >= 0) index = i;
    }

    /** 每项只占一行，避免路径过长自动换行导致「上移行数」与真实屏幕行数不一致 */
    const ttyCols =
      typeof output.columns === 'number' && output.columns > 0 ? output.columns : 80;
    const menuRow = (title) => {
      const maxContent = Math.max(12, ttyCols - 3);
      const s = `${title}`;
      return s.length <= maxContent ? s : `${s.slice(0, maxContent - 1)}…`;
    };

    /** 与 draw() 写入的换行符数量一致：1 行说明 + 每条目 1 行 */
    const menuScreenLineCount = () => 1 + entries.length;

    const draw = () => {
      const lines = [
        '请选择项目 workspace（↑↓ 移动，Enter 确定，Ctrl+C 退出）\n',
        ...entries.map((w, i) => {
          const row = `${menuRow(w.title)}`;
          return `${i === index ? '❯ ' : '  '}${row}\n`;
        }),
      ];
      output.write(lines.join(''));
    };

    const redraw = () => {
      output.write(`\x1b[${menuScreenLineCount()}A`);
      draw();
    };

    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();

    draw();

    const cleanup = () => {
      input.removeListener('keypress', onKeypress);
      input.setRawMode(false);
      input.pause();
    };

    const onKeypress = (_str, key) => {
      if (!key) return;
      if (key.ctrl && key.name === 'c') {
        cleanup();
        output.write('\n');
        process.exit(0);
      }
      if (key.name === 'up') {
        index = (index - 1 + entries.length) % entries.length;
        redraw();
        return;
      }
      if (key.name === 'down') {
        index = (index + 1) % entries.length;
        redraw();
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        output.write('\n');
        resolve(entries[index]);
      }
    };

    input.on('keypress', onKeypress);
  });

/**
 * 交互选择 workspace，写入用户目录 `chat-code-bridge.json` 的 `currentProject.workspace`（绝对路径）。
 * @param {{ stdin?: import('node:stream').Readable, stdout?: import('node:stream').Writable }} [io]
 * @returns {Promise<WorkspaceEntry>}
 */
export const selectProjectWorkspace = async (io = {}) => {
  const input = io.stdin ?? defaultInput;
  const output = io.stdout ?? defaultOutput;
  const entries = readProjectWorkspaceList();

  const picked = input.isTTY
    ? await selectWorkspaceInteractive(entries, input, output)
    : await selectWorkspaceByNumber(entries, input, output);

  console.log('picked', picked)

  writeConfig({ currentProject: picked });
  return picked;
};
