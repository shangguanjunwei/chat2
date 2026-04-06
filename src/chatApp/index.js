import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';

/** @typedef {{ key: string, label: string, env: { appId: string, appSecret: string, domain: string } }} BridgeDefinition */

const OPTIONS_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../config/chat-options.json');

/** @type {BridgeDefinition[]} */
export const BRIDGE_OPTIONS = JSON.parse(readFileSync(OPTIONS_PATH, 'utf8'));

const menuLineCount = () => 1 + BRIDGE_OPTIONS.length;

/**
 * 非 TTY：按序号选择 app。
 * @returns {Promise<BridgeDefinition>}
 */
const selectBridgeByNumber = async () => {
  const rl = readlinePromises.createInterface({ input, output });
  try {
    output.write('当前非交互式 TTY，请用序号选择：\n');
    BRIDGE_OPTIONS.forEach((b, i) => {
      output.write(`  ${i + 1}. ${b.label}\n`);
    });
    const raw = await rl.question('请输入序号: ');
    const idx = Number.parseInt(String(raw).trim(), 10) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= BRIDGE_OPTIONS.length) {
      throw new Error(`无效选项：${raw}`);
    }
    return BRIDGE_OPTIONS[idx];
  } finally {
    rl.close();
  }
};

/**
 * 选择桥接的聊天 app（TTY：↑↓ + Enter；否则输入序号）。
 * @returns {Promise<BridgeDefinition>}
 */
export const selectBridge = async () => {
  if (!input.isTTY) {
    return selectBridgeByNumber();
  }
  return await new Promise((resolve) => {
    let index = 0;

    const draw = () => {
      const parts = [
        '请选择桥接的聊天工具（↑↓ 移动，Enter 确定，Ctrl+C 退出）\n',
        ...BRIDGE_OPTIONS.map((b, i) => `${i === index ? '❯ ' : '  '}${b.label}\n`),
      ];
      output.write(parts.join(''));
    };

    const redraw = () => {
      output.write(`\x1b[${menuLineCount()}A`);
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
        index = (index - 1 + BRIDGE_OPTIONS.length) % BRIDGE_OPTIONS.length;
        redraw();
        return;
      }
      if (key.name === 'down') {
        index = (index + 1) % BRIDGE_OPTIONS.length;
        redraw();
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        output.write('\n');
        resolve(BRIDGE_OPTIONS[index]);
      }
    };

    input.on('keypress', onKeypress);
  });
};
