/** im.v1.messageReaction.create */
export const sendMessageReaction = async (client, options) => {
  const { message_id, emoji_type } = options;
  if (!message_id || !emoji_type) {
    throw new Error('sendMessageReaction: message_id 与 emoji_type 为必填');
  }
  return client.im.v1.messageReaction.create({
    path: { message_id },
    data: {
      reaction_type: { emoji_type },
    },
  });
};

export const deleteMessageReaction = async (client, options) => {
  const { message_id, reaction_id } = options;
  if (!message_id || !reaction_id) {
    throw new Error('deleteMessageReaction: message_id 与 reaction_id 为必填');
  }
  return client.im.v1.messageReaction.delete({
    path: { message_id, reaction_id },
  });
};