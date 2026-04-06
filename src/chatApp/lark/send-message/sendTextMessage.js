/** im.v1.message.create，msg_type: text */
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
