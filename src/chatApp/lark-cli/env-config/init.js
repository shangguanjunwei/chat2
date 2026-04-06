import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ensureBridgeEnvVars } from './envCheck.js';

/** @typedef {{ key: string, label: string, env: { appId: string, appSecret: string, domain: string } }} BridgeDefinition */

/** @type {BridgeDefinition[]} */
export const BRIDGE_OPTIONS = [
  {
    key: 'feishu',
    label: '飞书',
    env: {
      appId: 'FEISHU_APP_ID',
      appSecret: 'FEISHU_APP_SECRET',
      domain: 'FEISHU_DOMAIN',
    },
  },
  {
    key: 'lark',
    label: 'Lark（国际版）',
    env: {
      appId: 'LARK_APP_ID',
      appSecret: 'LARK_APP_SECRET',
      domain: 'LARK_DOMAIN',
    },
  },
];

const MENU_LINE_COUNT = () => 1 + BRIDGE_OPTIONS.length;

/**
 * TTY 下用 ↑↓ 选择，Enter 确定；非 TTY 时退回为输入序号。
 * @returns {Promise<BridgeDefinition>}
 */
export const selectBridge = () => {
  if (!input.isTTY) {
    return selectBridgeByNumber();
  }
  return new Promise((resolve) => {
    let index = 0;

    const draw = () => {
      const parts = [
        '请选择桥接的聊天工具（↑↓ 移动，Enter 确定，Ctrl+C 退出）\n',
        ...BRIDGE_OPTIONS.map((b, i) => `${i === index ? '❯ ' : '  '}${b.label}\n`),
      ];
      output.write(parts.join(''));
    };

    const redraw = () => {
      output.write(`\x1b[${MENU_LINE_COUNT()}A`);
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

/** @returns {Promise<BridgeDefinition>} */
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
 * 初始化：选择桥接工具并确保凭证就绪（环境变量已存在则直接用；否则交互输入并生成 `.lark-bridge-env.sh`）。
 *
 * @param {{ stdin?: import('node:stream').Readable, stdout?: import('node:stream').Writable, cwd?: string }} [io]
 * @returns {Promise<{ bridge: BridgeDefinition, appId: string, appSecret: string, domain: string }>}
 */
export const initBridgeConfiguration = async (io) => {
  const bridge = await selectBridge();
  const { appId, appSecret, domain } = await ensureBridgeEnvVars(bridge.env, io);
  return { bridge, appId, appSecret, domain };
};
