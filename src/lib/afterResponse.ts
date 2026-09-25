import { after } from "next/server";

/**
 * Runs `fn` without making the response wait on it — for work like activity-log
 * writes and realtime broadcasts that the caller doesn't need to see finish.
 * Prefers Next's `after()` so the work still completes under serverless/edge
 * runtimes that can freeze a function right after it responds; falls back to a
 * plain fire-and-forget call when there's no request scope to hook into (e.g.
 * route handlers invoked directly in tests via `callRoute`, where `after()`
 * throws synchronously).
 */
export function afterResponse(fn: () => Promise<unknown>): void {
  try {
    after(fn);
  } catch {
    fn();
  }
}
