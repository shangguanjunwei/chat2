import * as Lark from '@larksuiteoapi/node-sdk';

const baseConfig = {
  appId: 'cli_a94619b0e7f8dcb1',
  appSecret: 'M9Iiv8fQmvlCTyYRrfgRJhfnQQpOsTpK',
  domain: 'https://open.feishu.cn', // 飞书域名
  // domain: "https://open.larksuite.com", // lark域名
}

const client = new Lark.Client(baseConfig);
const wsClient = new Lark.WSClient({
  ...baseConfig,
  loggerLevel: Lark.LoggerLevel.debug
});

wsClient.start({
  // 处理「接收消息」事件，事件类型为 im.message.receive_v1
  eventDispatcher: new Lark.EventDispatcher({}).register({
    'im.message.receive_v1': async (data) => {
      const {
        message: { message_id, chat_id, content }
      } = data;
      // 先对当前消息添加表情回复，让用户立刻知道已收到（需 im:message.reactions:write_only 等权限）
      await client.im.v1.messageReaction.create({
        path: { message_id },
        data: {
          reaction_type: { emoji_type: 'Get' }
        }
      });
      await client.im.v1.messageReaction.create({
        path: { message_id },
        data: {
          reaction_type: { emoji_type: 'Typing' }
        }
      });
      await client.im.v1.message.create({
        params: {
          receive_id_type: "chat_id"
        },
        data: {
          receive_id: chat_id,
          content: Lark.messageCard.defaultCard({
            title: `回复： ${JSON.parse(content).text}`,
            content: '新年好'
          }),
          msg_type: 'interactive'
        }
      });
    }
  })
});