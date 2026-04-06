import * as Lark from '@larksuiteoapi/node-sdk';
import { initBridgeConfiguration } from './src/chatApp/lark-cli/env-config/init.js';

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
  const { appId, appSecret, domain } = await initBridgeConfiguration();
  startFeishuFamilyMessageListener({ appId, appSecret, domain });
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
