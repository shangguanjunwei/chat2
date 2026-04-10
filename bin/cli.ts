import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { drawLogo } from '@/utils/draw';
import { startCoreSystem } from '@/coreSystem';

/** CLI 与 dev 入口共用 */
export async function run(): Promise<void> {
  await startCoreSystem();
  drawLogo();
}

/** npm 全局 bin 多为指向 dist/cli.js 的 symlink，argv[1] 与 import.meta.url 路径不一致，需 realpath 再比 */
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
