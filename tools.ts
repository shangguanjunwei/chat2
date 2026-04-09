import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import dayjs from 'dayjs';

/** Cursor Agent CLI 单行 stream-json 事件的宽松形状（与 bash 中 jq 路径一致） */
interface StreamJsonLine {
  type?: string;
  subtype?: string;
  model?: string;
  duration_ms?: number;
  message?: {
    content?: Array<{ text?: string }>;
  };
  tool_call?: {
    writeToolCall?: {
      args?: { path?: string };
      result?: { success?: { linesCreated?: number; fileSize?: number } };
    };
    readToolCall?: {
      args?: { path?: string };
      result?: { success?: { totalLines?: number } };
    };
  };
}

function parseLine(line: string): StreamJsonLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as StreamJsonLine;
  } catch {
    return null;
  }
}

export function streamAgentProgress(prompt: string): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    let accumulatedText = '';
    let toolCount = 0;
    const startTimeSec = dayjs();
    const child = spawn(
      'agent',
      [
        '-p',
        '--force',
        // '--trust',
        // '--workspace',
        // workspace,
        // '--resume',
        // chatId,
        '--output-format',
        'stream-json',
        '--stream-partial-output',
        prompt
      ],
      { stdio: ['inherit', 'pipe', 'inherit'] }
    );

    const stdout = child.stdout;
    if (!stdout) {
      rejectPromise(new Error('agent stdout 不可用'));
      return;
    }
    const rl = createInterface({ input: stdout, crlfDelay: Infinity });
    rl.on('line', (raw) => {
      const line = parseLine(raw);
      if (!line) return;
      const { type, subtype } = line;
      switch (type) {
        case 'system':
          if (subtype === 'init') {
            const model = line.model ?? 'unknown';
            console.log(`🤖 使用模型: ${model}`);
          }
          break;

        case 'assistant': {
          const piece = line.message?.content?.[0]?.text ?? '';
          accumulatedText += piece;
          process.stdout.write(`\r📝 生成中: ${accumulatedText.length} 字符`);
          break;
        }

        case 'tool_call': {
          if (subtype === 'started') {
            toolCount += 1;
            const wt = line.tool_call?.writeToolCall;
            const rt = line.tool_call?.readToolCall;
            if (wt) {
              const path = wt.args?.path ?? 'unknown';
              console.log(`\n🔧 工具 #${toolCount}: 创建 ${path}`);
            } else if (rt) {
              const path = rt.args?.path ?? 'unknown';
              console.log(`\n📖 工具 #${toolCount}: 读取 ${path}`);
            }
          } else if (subtype === 'completed') {
            const wt = line.tool_call?.writeToolCall;
            const rt = line.tool_call?.readToolCall;
            if (wt?.result?.success !== undefined) {
              const lines = wt.result.success.linesCreated ?? 0;
              const size = wt.result.success.fileSize ?? 0;
              console.log(`   ✅ 已创建 ${lines} 行 (${size} 字节)`);
            } else if (rt?.result?.success !== undefined) {
              const lines = rt.result.success.totalLines ?? 0;
              console.log(`   ✅ 已读取 ${lines} 行`);
            }
          }
          break;
        }

        case 'result': {
          const endTimeSec = dayjs();
          const totalDuration = endTimeSec.diff(startTimeSec, 'millisecond');
          const totalTime = endTimeSec.diff(startTimeSec, 'second');
          console.log(`\n\n🎯 完成,耗时 ${totalDuration}ms (总计 ${totalTime}s)`);
          break;
        }

        default:
          break;
      }
    });

    child.on('error', (err) => {
      rejectPromise(err);
    });

    child.on('close', (code, signal) => {
      rl.close();
      if (signal) {
        rejectPromise(new Error(`agent 被信号终止: ${signal}`));
        return;
      }
      if (code !== 0 && code !== null) {
        rejectPromise(new Error(`agent 退出码: ${code}`));
        return;
      }
      resolvePromise(code ?? 0);
    });
  });
}

streamAgentProgress('33333').catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
