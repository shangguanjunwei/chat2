import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { drawLogo } from '@/utils/draw';
import { startCoreSystem } from '@/coreSystem';

/**
 * CLI 与 `tsx main.ts` 开发入口共用：先完成核心系统初始化，再绘制启动 Logo。
 */
export async function run(): Promise<void> {
  await startCoreSystem();
  drawLogo();
}

/**
 * 判断当前文件是否作为进程入口执行（npm 全局 bin 常为指向 `dist/cli.js` 的 symlink，
 * `argv[1]` 与 `import.meta.url` 字面路径可能不一致，需 `realpath` 后再比较）。
 */
const isMainModule = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      realpathSync(resolve(entry)) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();

if (isMainModule) {
  run().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
