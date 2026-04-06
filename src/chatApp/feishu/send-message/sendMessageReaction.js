/** im.v1.messageReaction.create */
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
