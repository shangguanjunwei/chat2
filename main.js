import * as Lark from '@larksuiteoapi/node-sdk';
import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/** @typedef {{ key: string, label: string, env: { appId: string, appSecret: string, domain: string } }} BridgeDefinition */

/** @type {BridgeDefinition[]} */
const BRIDGE_OPTIONS = [
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
const selectBridge = () => {
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
 * 依次补全缺失的 appId / appSecret / domain，并最终写入 process.env。
 * @param {BridgeDefinition} bridge
 * @returns {Promise<{ appId: string, appSecret: string, domain: string }>}
 */
const promptAndApplyBridgeEnv = async (bridge) => {
  const { env } = bridge;
  let appId = process.env[env.appId]?.trim() ?? '';
  let appSecret = process.env[env.appSecret]?.trim() ?? '';
  let domain = process.env[env.domain]?.trim() ?? '';

  const rl = readlinePromises.createInterface({ input, output });
  try {
    if (!appId) {
      appId = (await rl.question(`请输入 ${env.appId}: `)).trim();
    }
    if (!appSecret) {
      appSecret = (await rl.question(`请输入 ${env.appSecret}: `)).trim();
    }
    if (!domain) {
      domain = (
        await rl.question(
          `请输入 ${env.domain}（飞书示例 https://open.feishu.cn，国际版 https://open.larksuite.com）: `,
        )
      ).trim();
    }
  } finally {
    rl.close();
  }

  if (!appId || !appSecret || !domain) {
    throw new Error('appId、appSecret、domain 均不能为空');
  }

  process.env[env.appId] = appId;
  process.env[env.appSecret] = appSecret;
  process.env[env.domain] = domain;

  return { appId, appSecret, domain };
};

/** @param {{ appId: string, appSecret: string, domain: string }} baseConfig */
const startFeishuFamilyMessageListener = (baseConfig) => {
  const client = new Lark.Client(baseConfig);
  const wsClient = new Lark.WSClient({
    ...baseConfig,
    loggerLevel: Lark.LoggerLevel.debug,
  });

  wsClient.start({
    eventDispatcher: new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data) => {
        const {
          message: { message_id, chat_id, content },
        } = data;
        await client.im.v1.messageReaction.create({
          path: { message_id },
          data: { reaction_type: { emoji_type: 'Get' } },
        });
        await client.im.v1.messageReaction.create({
          path: { message_id },
          data: { reaction_type: { emoji_type: 'Typing' } },
        });
        await client.im.v1.message.create({
          params: { receive_id_type: 'chat_id' },
          data: {
            receive_id: chat_id,
            content: Lark.messageCard.defaultCard({
              title: `回复： ${JSON.parse(content).text}`,
              content: '新年好',
            }),
            msg_type: 'interactive',
          },
        });
      },
    }),
  });

  console.log('消息监听服务已启动（WebSocket，im.message.receive_v1）。');
};

const main = async () => {
  const bridge = await selectBridge();
  const { appId, appSecret, domain } = await promptAndApplyBridgeEnv(bridge);
  startFeishuFamilyMessageListener({ appId, appSecret, domain });
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
