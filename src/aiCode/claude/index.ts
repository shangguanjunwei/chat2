import { AiCode } from "@/model/aiCode";
import { spawn } from 'node:child_process';
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs";
import { createInterface } from 'node:readline';
import { addLog } from "@/utils/log";
import { parseLine } from './utils/index';
import aiCodeStatusTemplate from '@config/json/chat-code-bridge.base.config.json';
import eventBus from "@/eventBus/index";
import { readFileContentAsJson, getFilePath } from '@/utils/fileEvents';

export class ClaudeAiCode extends AiCode {
  option: ChatCodeBridgeOption;
  flag: boolean = false;

  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
  }

  getLatestOption(): any {
    if (this.flag) return this.option;
    const userLocalChatCodeBridgeConfig = readFileContentAsJson(getFilePath('USER_LOCAL_CHAT_CODE_BRIDGE_CONFIG'));
    const obj = userLocalChatCodeBridgeConfig.find((item: ChatCodeBridgeOption) => item.uuid === this.option.uuid);
    this.option = obj;
    if (obj.currentChatSession.endsWith('-create-hasUsed')) {
      this.flag = true;
    }
    return this.option;
  }

  chatByStream(prompt: string, printFn: (obj: StreamPrintFnParams) => Promise<void>): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let option = this.getLatestOption();
      let shortCli = '';
      let sessionId = option.currentChatSession;
      console.log('option', option);
      if (option.currentChatSession.endsWith('-create')) {
        eventBus.emit(
          `${option.uuid}:setCurrentChatSessionByUuid`,
          { uuid: option.uuid, sessionId: option.currentChatSession + '-hasUsed' }
        );
        sessionId = sessionId.replace('-create', '');
        shortCli = '--session-id';
      } else if (option.currentChatSession.endsWith('-create-hasUsed')) {
        sessionId = sessionId.replace('-create-hasUsed', '');
        shortCli = '-r';
      } else {
        throw new Error('当前会话状态不正确');
      }
      let accumulatedText = '';
      const startTimeSec = dayjs();
      const child = spawn(
        'claude',
        [
          shortCli,
          sessionId,
          '--allowedTools',
          'Bash(git:*)',
          '--effort',
          'high',
          '-p',
          prompt,
          '--output-format',
          'stream-json',
          '--include-partial-messages',
          '--verbose'
        ],
        {
          cwd: option.currentProject.workspace,
          stdio: ['inherit', 'pipe', 'inherit']
        }
      );
      const stdout = child.stdout;
      if (!stdout) {
        reject(new Error('agent stdout 不可用'));
        return;
      }
      const rl = createInterface({ input: stdout, crlfDelay: Infinity });
      let lastMessageText = '';
      rl.on('line', async (raw) => {
        addLog(option.appBotOption.appId, raw);
        const line = parseLine(raw);
        if (!line) return;
        const { type, subtype } = line;
        switch (type) {
          case 'system':
            if (subtype === 'init') {
              printFn({
                text: aiCodeStatusTemplate.aiCodeStatusTemplate.thinking.text,
                status: 'thinking',
              });
            }
            break;
          case 'assistant': {
            const obj: any = line.message?.content?.[0] ?? {};
            const piece = obj.type === 'text' ? obj.text : '';
            if (piece !== lastMessageText) {
              lastMessageText = piece;
              accumulatedText += piece;
              printFn({
                text: accumulatedText.trim() + '\n\n --- \n' + aiCodeStatusTemplate.aiCodeStatusTemplate.processing.text,
                status: 'processing',
              });
            }
            break;
          }
          case 'result': {
            const totalDuration = dayjs().diff(startTimeSec, 'millisecond');
            printFn({
              text: [
                (line as any).result ?? '',
                '\n --- ',
                aiCodeStatusTemplate.aiCodeStatusTemplate.completed.text.replace('${totalDuration}', totalDuration.toString())
              ].join('\n'),
              status: 'completed',
            });
            break;
          }
          default:
            break;
        }
      });
      child.on('error', reject);
      child.on('close', (code, signal) => {
        rl.close();
        if (signal) {
          reject(new Error(`agent 被信号终止: ${signal}`));
          return;
        }
        if (code !== 0 && code !== null) {
          reject(new Error(`agent 退出码: ${code}`));
          return;
        }
        resolve(code ?? 0);
      });
    });
  }

  chatByText(prompt: string): Promise<any> {
    return Promise.resolve('');
  }

  createChat(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(uuidv4() + '-create');
    });
  }
}