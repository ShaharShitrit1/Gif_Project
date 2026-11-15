/**
 * "Bring your own key": when the site has no ANTHROPIC_API_KEY, a visitor may send their own
 * Claude API key in the `x-user-api-key` header. It is used for that one request only (scoped
 * with AsyncLocalStorage), never stored and never logged.
 */
import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<string | null>();

export const USER_KEY_HEADER = "x-user-api-key";

export function readUserKey(request: Request): string | null {
  const v = request.headers.get(USER_KEY_HEADER)?.trim() ?? "";
  return /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(v) ? v : null;
}

export function withUserKey<T>(key: string | null, fn: () => T): T {
  return store.run(key, fn);
}

export function currentUserKey(): string | null {
  return store.getStore() ?? null;
}
