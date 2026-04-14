import { devtools } from 'zustand/middleware';

/**
 * 按需启用 Redux DevTools。
 * 在 URL 中添加 ?debug=<name> 参数即可开启对应 store 的调试。
 * 例如：http://localhost:5173?debug=chat
 */
export const createDevtools =
  (name: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (initializer: any): any => {
    const showDevtools =
      typeof window !== 'undefined' &&
      new URL(window.location.href).searchParams.get('debug')?.includes(name) === true;

    return showDevtools
      ? devtools(initializer, { name: `MimiClaw_${name}`, enabled: true })
      : initializer;
  };
