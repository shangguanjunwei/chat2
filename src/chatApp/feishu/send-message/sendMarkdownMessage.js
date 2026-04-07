/**
 * im.v1.message.create，msg_type: post。
 * 使用富文本中的 `md` 段落渲染 Markdown（列表、代码块、引用等），参见开放平台「发送消息内容结构」- 富文本 post - md 标签。
 */
export const sendMarkdownMessage = async (client, options) => {
  const { receive_id, receive_id_type = 'chat_id', text } = options;
  if (!receive_id || text == null) {
    throw new Error('sendMarkdownMessage: receive_id 与 markdown 为必填');
  }
  const postBody = {
    zh_cn: {
      // title: '111',
      content: [[{ tag: 'md', text: String(text) }]],
    },
  };
  return client.im.v1.message.create({
    params: { receive_id_type: receive_id_type },
    data: {
      receive_id: receive_id,
      msg_type: 'post',
      content: JSON.stringify(postBody),
    },
  });
};
