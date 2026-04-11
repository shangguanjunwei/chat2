import readlinePromises from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/**
 * 按 `options` 逐项提示用户输入（如 appId、secret），直到非空，组装为 `valueKey` → 值的映射。
 *
 * @param options 每项含 `labelKey`/`valueKey` 对应字段
 * @param labelKey 展示名称字段
 * @param valueKey 写入结果的键名字段
 */
export const inputAction = async (
  options: Item[],
  labelKey: string = 'label',
  valueKey: string = 'value'
) => {
  const rl = readlinePromises.createInterface({ input: stdin, output: stdout });
  const creds: Item = {};
  try {
    for (const option of options) {
      let value: string | undefined;
      // ✅ 核心：循环直到输入合法
      while (true) {
        value = await rl.question(`${option[labelKey]}: \n`);
        if (value && value.trim()) break;
        // ❗只提示，不中断
        stdout.write('\x1b[31m输入不能为空，请重新输入\x1b[0m\n'); // 红色提示
      }
      Object.assign(creds, {
        [option[valueKey] as string]: value.trim(),
      });
    }
    return creds;
  } finally {
    rl.close();
  }
};