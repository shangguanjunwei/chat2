import { drawLogo } from '@/utils/draw';
import { startCoreSystem } from '@/coreSystem';

(async () => {
  await startCoreSystem();
  drawLogo();
})();