/**
 * im.v1.messageReaction.create（需相应 im:message 表情权限）
 *
 * @param {import('@larksuiteoapi/node-sdk').Client} client
 * @param {{ messageId: string, emojiType: string }} options
 */
export const sendMessageReaction = async (client, options) => {
  const { messageId, emojiType } = options;
  if (!messageId || !emojiType) {
    throw new Error('sendMessageReaction: messageId 与 emojiType 为必填');
  }
  return client.im.v1.messageReaction.create({
    path: { message_id: messageId },
    data: {
      reaction_type: { emoji_type: emojiType },
    },
  });
};
