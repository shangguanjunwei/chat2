/**
 * 使用 @larksuiteoapi/node-sdk 发送文本消息（im.v1.message.create，msg_type: text）
 *
 * @param {import('@larksuiteoapi/node-sdk').Client} client - 已配置 appId / appSecret 的 Lark Client
 * @param {object} options
 * @param {string} options.receiveId - 接收方 ID（与 receiveIdType 对应）
 * @param {'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id'} [options.receiveIdType='chat_id']
 * @param {string} options.text - 纯文本内容
 */
export const sendTextMessage = async (client, options) => {
  const { receiveId, receiveIdType = 'chat_id', text } = options;
  if (!receiveId || text == null) {
    throw new Error('sendTextMessage: receiveId 与 text 为必填');
  }
  return client.im.v1.message.create({
    params: { receive_id_type: receiveIdType },
    data: {
      receive_id: receiveId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    },
  });
};
