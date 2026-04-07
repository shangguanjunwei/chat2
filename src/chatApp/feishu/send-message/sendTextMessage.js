/** im.v1.message.create，msg_type: text */
export const sendTextMessage = async (client, options) => {
  const { receive_id, receive_id_type = 'chat_id', text } = options;
  if (!receive_id || text == null) {
    throw new Error('sendTextMessage: receive_id 与 text 为必填');
  }
  return client.im.v1.message.create({
    params: { receive_id_type: receive_id_type },
    data: {
      receive_id: receive_id,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    },
  });
};
