import AiBot from '@wecom/aibot-node-sdk';
import { generateReqId } from '@wecom/aibot-node-sdk';
import { sendMessageToCursorImpl } from '../../aiCode/cursor/index.js';

export const startWecomMessageListener = async (bridge) => {
  // 1. 创建客户端实例
  const wsClient = new AiBot.WSClient({
    botId: bridge.botId,       // 企业微信后台获取的机器人 ID
    secret: bridge.secret,  // 企业微信后台获取的机器人 Secret
  });

  // 2. 建立连接（支持链式调用）
  wsClient.connect();

  // 3. 监听认证成功
  wsClient.on('authenticated', () => {
    console.log('🔐 认证成功');
  });

  // 4. 监听文本消息并进行流式回复
  wsClient.on('message.text', async (frame) => {
    const content = frame.body.text?.content;
    console.log(`收到文本: ${content}`);

    const streamId = generateReqId('stream');

    // 发送流式中间内容
    wsClient.replyStream(frame, streamId, '正在思考中...', false);

    const result = await sendMessageToCursorImpl(content);
    wsClient.replyStream(frame, streamId, result.text, true);
  });

  // 5. 监听进入会话事件（发送欢迎语）
  wsClient.on('event.enter_chat', (frame) => {
    wsClient.replyWelcome(frame, {
      msgtype: 'text',
      text: { content: '您好！我是智能助手，有什么可以帮您的吗？' },
    });
  });

  // 6. 优雅退出
  process.on('SIGINT', () => {
    wsClient.disconnect();
    process.exit(0);
  });
};
