import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';
import { readCofig } from '../../utils/readCofig.js';
import { writeConfig } from '../../utils/writeConfig.js';

/**
 * @typedef {{ key: string, label: string, needConfigKeys: Array<{ key: string, label: string, defaultValue?: string }> }} BridgeDefinition
 */

const OPTIONS_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../config/chat-options.json');

/** @type {BridgeDefinition[]} */
const BRIDGE_OPTIONS = JSON.parse(readFileSync(OPTIONS_PATH, 'utf8'));

const menuLineCount = () => 1 + BRIDGE_OPTIONS.length;

const readCredentialsFromUserFile = (bridge) => {
  const data = readCofig();
  const creds = {};
  for (const key of bridge.needConfigKeys) {
    const value = data.chatApp[`${bridge.key}`][`${key.key}`];
    if (!value) {
      return null;
    }
    creds[`${key.key}`] = value;
  }
  return creds;
};

const selectBridgeByNumber = async (input, output) => {
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

const selectBridgeInteractive = (input, output) =>
  new Promise((resolve) => {
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

const promptPlatformCredentials = async (bridge, input, output) => {
  const rl = readlinePromises.createInterface({ input, output });
  const creds = {};
  try {
    for (const key of bridge.needConfigKeys) {
      let value = await rl.question(`${key.label}: \n`);
      if (!value && key.defaultValue) {
        value = key.defaultValue;
      }
      if (!value) {
        throw new Error(`${key.label} 不能为空`);
      }
      creds[key.key] = value;
    }
    return creds;
  } finally {
    rl.close();
  }
};

/** 选择桥接：优先用户目录配置，缺项则交互补全并写回。 */
export const selectAppBridge = async (io = {}) => {
  const input = io.stdin ?? defaultInput;
  const output = io.stdout ?? defaultOutput;

  const bridge = input.isTTY
    ? await selectBridgeInteractive(input, output)
    : await selectBridgeByNumber(input, output);

  let fromFile = readCredentialsFromUserFile(bridge);
  if (!fromFile) {
    fromFile = await promptPlatformCredentials(bridge, input, output);
  }
  const config = {};
  for (const key of bridge.needConfigKeys) {
    config[`chatApp.${bridge.key}.${key.key}`] = fromFile[key.key];
  }
  writeConfig({
    ...config,
    appBridge: bridge.key,
  });
  delete bridge.needConfigKeys;
  return { ...bridge, ...fromFile };
};
