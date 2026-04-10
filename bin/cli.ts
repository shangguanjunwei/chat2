import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { drawLogo } from '@/utils/draw';
import { startCoreSystem } from '@/coreSystem';

/** CLI 与 dev 入口共用 */
export async function run(): Promise<void> {
  await startCoreSystem();
  drawLogo();
}

const isMainModule =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  run().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
