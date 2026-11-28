// 新版本：装到主屏幕的 App 从背景切回来时不会重新加载页面，也就不会去查有没有新版本。
// 这里在 App 一打开、以及每次切回前景时都去查一次；新版本装好时：
//   - 刚打开或刚切回来的 20 秒内（人还没开始用），直接重新加载；
//   - 正在用的时候，只在画面上方提示“有新版本”，让人自己点，不打断正在做的事；
//   - 提示过但没点的，下次切回前景时重新加载。
import { registerSW } from 'virtual:pwa-register';

let ready = false;
let lastResume = Date.now();
const listeners = new Set<() => void>();

/** 新版本已经装好、等着重新加载时通知；回传取消订阅的函数。 */
export function onUpdateReady(fn: () => void): () => void {
  listeners.add(fn);
  if (ready) fn();
  return () => listeners.delete(fn);
}

export function applyUpdate(): void {
  window.location.reload();
}

export function startUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  let reg: ServiceWorkerRegistration | undefined;
  let lastCheck = 0;
  const check = () => {
    if (!reg || Date.now() - lastCheck < 30_000) return;
    lastCheck = Date.now();
    reg.update().catch(() => undefined);
  };
  registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      reg = r;
    },
    onNeedReload() {
      if (document.visibilityState === 'hidden' || Date.now() - lastResume < 20_000) applyUpdate();
      else {
        ready = true;
        listeners.forEach((f) => f());
      }
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    lastResume = Date.now();
    if (ready) applyUpdate();
    else check();
  });
}
