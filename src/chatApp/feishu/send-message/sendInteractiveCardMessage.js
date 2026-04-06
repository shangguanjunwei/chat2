import * as Lark from '@larksuiteoapi/node-sdk';

/**
 * im.v1.message.create，msg_type: interactive。`content` 与 `defaultCard` 二选一。
 *
 * @param {import('@larksuiteoapi/node-sdk').Client} client
 * @param {{
 *   receiveId: string,
 *   receiveIdType?: string,
 *   content?: string | object,
 *   defaultCard?: { title: string, content: string },
 * }} options
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
      'sendInteractiveCardMessage: 需提供 content 或 defaultCard: { title, content }',
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
