import * as Lark from '@larksuiteoapi/node-sdk';

/**
 * 使用 @larksuiteoapi/node-sdk 发送可交互卡片消息（im.v1.message.create，msg_type: interactive）
 *
 * 二选一：
 * - `content`：完整卡片 JSON 字符串；若为对象会先 `JSON.stringify`
 * - `defaultCard`：`{ title, content }`，内部使用 `Lark.messageCard.defaultCard` 生成内容
 *
 * @param {import('@larksuiteoapi/node-sdk').Client} client - 已配置 appId / appSecret 的 Lark Client
 * @param {object} options
 * @param {string} options.receiveId - 接收方 ID（与 receiveIdType 对应）
 * @param {'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id'} [options.receiveIdType='chat_id']
 * @param {string | object} [options.content] - 卡片体（字符串或可被 JSON 序列化的对象）
 * @param {{ title: string, content: string }} [options.defaultCard] - 简易蓝头 Markdown 卡片
 */
export const sendInteractiveCardMessage = async (client, options) => {
  const { receiveId, receiveIdType = 'chat_id', content, defaultCard: dc } = options;
  if (!receiveId) {
    throw new Error('sendInteractiveCardMessage: receiveId 为必填');
  }
  let cardContent;
  if (content != null) {
    cardContent = typeof content === 'string' ? content : JSON.stringify(content);
  } else if (dc != null && dc.title != null && dc.content != null) {
    cardContent = Lark.messageCard.defaultCard({ title: dc.title, content: dc.content });
  } else {
    throw new Error(
      'sendInteractiveCardMessage: 需提供 content（卡片 JSON）或 defaultCard: { title, content }',
    );
  }
  return client.im.v1.message.create({
    params: { receive_id_type: receiveIdType },
    data: {
      receive_id: receiveId,
      msg_type: 'interactive',
      content: cardContent,
    },
  });
};
