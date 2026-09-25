import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and hydration, true afterwards — for output that depends
 * on the browser's locale/timezone (e.g. `toLocaleString()`), which would
 * otherwise differ between the server render and hydration and make React
 * discard the server HTML.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
