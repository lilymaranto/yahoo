export type SyncReason = "default" | "manual" | "restore" | "fallback" | "admin";

export interface StartWebSessionArgs {
  userId: string;
  configId: string;
}

/**
 * Call on first paint/config load. Internally uses DemoBridge.startSession(reason="default").
 */
export function startWebSession(args: StartWebSessionArgs): void;

/**
 * Call on every web-initiated user change. Internally uses DemoBridge.startSession(reason=<reason>).
 */
export function setUser(userId: string, reason?: SyncReason): void;

/**
 * Register once to handle native → web identity updates. Invokes your changeUserFn(userId, detail?).
 */
export function listenForNative(
  changeUserFn: (userId: string, detail?: Record<string, unknown>) => void
): void;
