import AiBot, { generateReqId, WSClient, WsFrame } from '@wecom/aibot-node-sdk';
import { ChatApp } from '@/model/chatApp';
import eventBus from '@/eventBus';
import { addLog } from '@/utils/log';
export class WecomChatApp extends ChatApp {
  option: ChatCodeBridgeOption;
  wsClient: WSClient | null = null;
  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
    this.init(option);
  }
  init(data: ChatCodeBridgeOption) {
    this.wsClient = new AiBot.WSClient({
      ...data.appBotOption as any,
    }).connect()
      .on('authenticated', () => {
        addLog(this.option.appBotOption.botId as string, '🔐 认证成功');
      })
      .on('message.text', (frame: WsFrame) => {
        if (!this.messageIsToThisBot(frame)) return;
        const streamId = generateReqId('stream');
        addLog(this.option.appBotOption.botId as string, `Q：${frame?.body?.text?.content}`);
        eventBus.emit(`${data.uuid}:messageBridge`, {
          text: frame?.body?.text?.content,
          msgid: frame?.body?.msgid,
          aibotid: frame?.body?.aibotid,
          streamId,
          frame,
        });
      })
      .on('event.enter_chat', (frame) => {
        this.sendWelcomeMessage(frame);
      });

    process.on('SIGINT', () => {
      this.wsClient!.disconnect();
      process.exit(0);
    });
  }
  messageIsToThisBot(data: any): boolean {
    return data.body.aibotid === this.option.appBotOption.botId;
  }
  async sendMessage(data: AiCode2ChatAppResponseContent) {
    const { body: { from: { userid }, chatid = '', chattype } } = data.option.frame;
    const id = chattype === 'group' ? chatid : userid;
    this.wsClient!.sendMessage(id, {
      msgtype: 'markdown',
      markdown: { content: data.result.text },
    });
  }
  async sendPrefixMessage(data: AiCode2ChatAppResponseContent) {
    this.wsClient!.replyStream(data.option.frame, data.option.streamId, data.result.text, false);
    return data.option;
  }
  async sendSuffixMessage(data: AiCode2ChatAppResponseContent) {
    addLog(this.option.appBotOption.botId as string, `A：${data.result.text}`);
    this.wsClient!.replyStream(data.option.frame, data.option.streamId, data.result.text, true);
  }
  sendWelcomeMessage(frame: WsFrame) {
    this.wsClient!.replyWelcome(frame, {
      msgtype: 'text',
      text: { content: '元气满满的一天～\n您好！我是智能助手，有什么可以帮您的吗？' },
    });
  }
  async sendStreamMessage(data: AiCode2ChatAppResponseContent) {
    this.wsClient!.replyStream(data.option.frame, data.option.streamId, data.result.text, false);
  }
}