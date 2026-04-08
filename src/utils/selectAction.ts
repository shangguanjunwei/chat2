import readlinePromises from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline';


const getLabel = (item: Item, labelKey: string) =>
  String(item[labelKey] ?? '');

const selectByNumber = async (
  options: Item[],
  labelKey: string,
): Promise<ChatAppItemConfig> => {
  const rl = readlinePromises.createInterface({ input: stdin, output: stdout });
  try {
    stdout.write('当前非交互式 TTY，请输入序号选择：\n');
    options.forEach((item, i) => {
      stdout.write(`  ${i + 1}. ${getLabel(item, labelKey)}\n`);
    });
    const raw = await rl.question('请输入序号: ');
    const idx = Number.parseInt(raw.trim(), 10) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      throw new Error(`无效选项：${raw}`);
    }
    return options[idx] as ChatAppItemConfig;
  } finally {
    rl.close();
  }
};

const selectByInteractive = (
  options: Item[],
  labelKey: string,
): Promise<ChatAppItemConfig> =>
  new Promise((resolve, reject) => {
    let index = 0;
    const lineCount = 1 + options.length;
    const draw = () => {
      const lines = [
        '请选择（↑↓ 移动，Enter 确定，Ctrl+C/ESC 退出）\n',
        ...options.map((item, i) => {
          const isActive = i === index;
          const label = String(getLabel(item, labelKey) ?? '');
          const prefix = isActive ? '\x1b[7m' : '';
          const suffix = isActive ? '\x1b[0m' : '';
          return `${prefix}${isActive ? '❯ ' : '  '}${label}${suffix}\n`;
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
      if (key.name === 'return' || key.name === 'enter') {
        const selected = options[index];
        cleanup();
        stdout.write('\n');
        resolve(selected as ChatAppItemConfig);
      }
    };
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    draw();
    stdin.on('keypress', onKeypress);
  });

export const selectAction = async (
  options: Item[],
  labelKey: string = 'label',
): Promise<ChatAppItemConfig> => {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('选项不能为空');
  }
  return stdin.isTTY
    ? await selectByInteractive(options, labelKey)
    : await selectByNumber(options, labelKey);
};