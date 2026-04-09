import dayjs from "dayjs";
import { spawn } from "node:child_process";
import { AiCode } from "@/model/aiCode";
import { createInterface } from 'node:readline';
import { parseLine } from './utils/index';

export class CursorAiCode extends AiCode {
  option: ChatCodeBridgeOption = {
    uuid: '',
    appBridge: '',
    aiCodeBridge: '',
    currentProject: {
      key: '',
      title: '',
      workspace: '',
    },
    appBotOption: {
      key: '',
      label: '',
      needConfigKeys: [],
    },
    currentChatSession: '',
  }

  constructor(option: ChatCodeBridgeOption) {
    super();
    this.option = option;
  }
  createChat(): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'agent',
        ['create-chat'],
        {
          cwd: this.option.currentProject.workspace,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', c => stdout += c);
      child.stderr.on('data', c => stderr += c);
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          this.option.currentChatSession = stdout.trim();
          resolve(this.option.currentChatSession);
        } else {
          reject(new Error(stderr.trim() || stdout.trim() || `agent 退出码 ${code}`));
        }
      });
    });
  }
  chatByStream(
    prompt: string,
    printFn: (obj: StreamPrintFnParams) => Promise<void>
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let accumulatedText = '';
      const startTimeSec = dayjs();
      const child = spawn(
        'agent',
        [
          '-p',
          '--force',
          '--trust',
          '--workspace',
          this.option.currentProject.workspace,
          '--resume',
          this.option.currentChatSession,
          '--output-format',
          'stream-json',
          '--stream-partial-output',
          prompt
        ],
        { stdio: ['inherit', 'pipe', 'inherit'] }
      );
      const stdout = child.stdout;
      if (!stdout) {
        reject(new Error('agent stdout 不可用'));
        return;
      }
      const rl = createInterface({ input: stdout, crlfDelay: Infinity });
      rl.on('line', async (raw) => {
        const line = parseLine(raw);
        if (!line) return;
        const { type, subtype } = line;
        switch (type) {
          case 'system':
            if (subtype === 'init') {
              await printFn({
                text: '🤔 思考中...',
                status: 'thinking',
              });
            }
            break;
          case 'assistant': {
            console.log('line', JSON.stringify(line.message), '\n');
            const piece = line.message?.content?.[0]?.text ?? '';
            accumulatedText += piece;
            await printFn({
              text: piece,
              status: 'processing',
            });
            break;
          }
          case 'result': {
            const endTimeSec = dayjs();
            const totalDuration = endTimeSec.diff(startTimeSec, 'millisecond');
            const totalTime = endTimeSec.diff(startTimeSec, 'second');
            accumulatedText += `\n\n🎯 完成,耗时 ${totalDuration}ms (总计${totalTime}s)`;
            await printFn({
              text: accumulatedText,
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
    return new Promise((resolve, reject) => {
      const child = spawn(
        'agent',
        [
          '-p',
          '--force',
          '--trust',
          '--workspace',
          this.option.currentProject.workspace,
          '--resume',
          this.option.currentChatSession,
          '--output-format',
          'text',
          prompt
        ],
        {
          cwd: this.option.currentProject.workspace,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', c => stdout += c);
      child.stderr.on('data', c => stderr += c);
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          // this.option.currentChatSession = stdout.trim();
          resolve(null);
        } else {
          reject(new Error(stderr.trim() || stdout.trim() || `agent 退出码 ${code}`));
        }
      });
    });
  }
}