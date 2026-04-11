import { AiCode } from "@/model/aiCode";
import { spawn } from 'node:child_process';
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs";
import { createInterface } from 'node:readline';
import { addLog } from "@/utils/log";
import { parseLine } from './utils/index';
import aiCodeStatusTemplate from '@config/json/chat-code-bridge.base.config.json';

export class ClaudeAiCode extends AiCode {
  option: ChatCodeBridgeOption;
  sessionId: string = '';

  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
  }

  chatByStream(prompt: string, printFn: (obj: StreamPrintFnParams) => Promise<void>): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let accumulatedText = '';
      const startTimeSec = dayjs();
      const child = spawn(
        'claude',
        [
          this.sessionId ? '-r' : '--session-id',
          this.option.currentChatSession,
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
        { stdio: ['inherit', 'pipe', 'inherit'] }
      );
      const stdout = child.stdout;
      if (!stdout) {
        reject(new Error('agent stdout 不可用'));
        return;
      }
      const rl = createInterface({ input: stdout, crlfDelay: Infinity });
      let lastMessageText = '';
      rl.on('line', async (raw) => {
        addLog(this.option.appBotOption.appId, raw);
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
            this.sessionId = this.option.currentChatSession;
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
      resolve(uuidv4());
    });
  }
}