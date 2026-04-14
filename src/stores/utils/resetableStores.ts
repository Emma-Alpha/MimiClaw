import { unstable_batchedUpdates } from 'react-dom';
import type { StoreApi } from 'zustand';

/**
 * 全局 Store 重置工具。
 *
 * 使用方式：
 * 1. 在需要支持重置的 store 的 State 接口中添加 `reset: () => void`
 * 2. 在 store 实现中提供 `reset: () => set(initialState)` 的实现
 * 3. 将该 store 添加到下方的 resetableStores 列表
 *
 * 调用 resetAllStores() 会在一次批量更新中重置所有已注册的 store，
 * 适用于登出、切换账户等需要清空所有业务状态的场景。
 */

type ResettableStore = StoreApi<{ reset?: () => void }>;

const resetableStores: ResettableStore[] = [];

/**
 * 注册一个支持 reset() 的 store。
 * 在 store 初始化后调用。
 */
export function registerResettableStore(store: ResettableStore): void {
  if (!resetableStores.includes(store)) {
    resetableStores.push(store);
  }
}

/**
 * 批量重置所有已注册的 store。
 * 跳过未实现 reset() 的 store。
 */
export function resetAllStores(): void {
  unstable_batchedUpdates(() => {
    for (const store of resetableStores) {
      store.getState().reset?.();
    }
  });
}
