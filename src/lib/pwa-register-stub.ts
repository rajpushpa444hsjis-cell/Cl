// 预览连结版（--mode artifact）没有 Service Worker：用这个空的 registerSW 代替 virtual:pwa-register。
export function registerSW(): (reload?: boolean) => Promise<void> {
  return async () => undefined;
}
