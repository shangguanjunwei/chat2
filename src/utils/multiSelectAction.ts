import readlinePromises from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline';

const getLabel = <T>(item: T, labelKey: string) =>
  String(item[labelKey as keyof T] ?? '');

const multiSelectByNumbers = async <T>(
  options: T[],
  labelKey: string,
): Promise<T[]> => {
  const rl = readlinePromises.createInterface({ input: stdin, output: stdout });
  try {
    stdout.write('当前非交互式 TTY，请输入序号（多选用英文逗号或空格分隔，如 1,3 或 1 3）\n');
    options.forEach((item, i) => {
      stdout.write(`  ${i + 1}. ${getLabel(item, labelKey)}\n`);
    });
    const raw = (await rl.question('请输入: ')).trim();
    if (!raw) {
      return [];
    }
    const parts = raw.split(/[,\s]+/).filter(Boolean);
    const indices = new Set<number>();
    for (const p of parts) {
      const idx = Number.parseInt(p.trim(), 10) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
        throw new Error(`无效选项：${raw}`);
      }
      indices.add(idx);
    }
    return [...indices]
      .sort((a, b) => a - b)
      .map((i) => options[i] as T);
  } finally {
    rl.close();
  }
};

const multiSelectByInteractive = <T>(
  options: T[],
  labelKey: string,
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    let index = 0;
    const selected = new Set<number>();
    const lineCount = 1 + options.length;
    const draw = () => {
      const lines = [
        '多选（↑↓ 移动，Space 切换选中，Enter 确认，Ctrl+C/ESC 退出）\n',
        ...options.map((item, i) => {
          const label = String(getLabel(item, labelKey) ?? '');
          const checked = selected.has(i);
          const box = checked ? '[x]' : '[ ]';
          const isFocused = i === index;
          const prefix = isFocused ? '\x1b[7m' : '';
          const suffix = isFocused ? '\x1b[0m' : '';
          return `${prefix}  ${box} ${label}${suffix}\n`;
        }),
      ];
      stdout.write(lines.join(''));
    };
    const redraw = () => {
      stdout.write(`\x1b[${lineCount}A`);
      draw();
    };
    const cleanup = () => {
      stdin.removeListener('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onKeypress = (_: string, key: readline.Key) => {
      if (!key) return;
      if (key.ctrl && key.name === 'c') {
        cleanup();
        stdout.write('\n');
        reject(new Error('用户取消'));
        return;
      }
      if (key.name === 'escape') {
        cleanup();
        stdout.write('\n');
        reject(new Error('用户取消'));
        return;
      }
      if (key.name === 'up') {
        index = (index - 1 + options.length) % options.length;
        redraw();
        return;
      }
      if (key.name === 'down') {
        index = (index + 1) % options.length;
        redraw();
        return;
      }
      if (key.sequence === ' ' || key.name === 'space') {
        if (selected.has(index)) {
          selected.delete(index);
        } else {
          selected.add(index);
        }
        redraw();
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        const result = [...selected]
          .sort((a, b) => a - b)
          .map((i) => options[i] as T);
        cleanup();
        stdout.write('\n');
        resolve(result);
      }
    };
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    draw();
    stdin.on('keypress', onKeypress);
  });

export const multiSelectAction = async <T>(
  options: T[],
  labelKey: string = 'label',
): Promise<T[]> => {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('选项不能为空');
  }
  return stdin.isTTY
    ? await multiSelectByInteractive<T>(options, labelKey)
    : await multiSelectByNumbers<T>(options, labelKey);
};
