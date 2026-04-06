/**
 * 使用 @larksuiteoapi/node-sdk 给指定消息添加表情回复（im.v1.messageReaction.create）
 *
 * 需具备 im:message.reactions:write 等相关权限；emoji_type 为飞书预置表情标识，如 THUMBSUP、Get、Typing 等。
 *
 * @param {import('@larksuiteoapi/node-sdk').Client} client - 已配置 appId / appSecret 的 Lark Client
 * @param {object} options
 * @param {string} options.messageId - 目标消息 message_id
 * @param {string} options.emojiType - 表情类型标识（reaction_type.emoji_type）
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
