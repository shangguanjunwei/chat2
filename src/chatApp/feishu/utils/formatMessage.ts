export const getFormattedData = (data: any) => {
  const { chat_type, chat_id, message_id, mentions = [] } = data.message;
  const content = JSON.parse(data.message.content);
  if (chat_type === 'group') {
    let { text } = content;
    for (const mention of mentions) {
      text = text.replace(`${mention.key}`, '');
    }
    return {
      chat_type,
      chat_id,
      content: { text: text.trim() },
      message_id,
    };
  }
  if (chat_type === 'p2p') {
    return {
      chat_type,
      chat_id,
      content: content,
      message_id,
    };
  }
  return null;
};