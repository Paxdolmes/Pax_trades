// Web build: no push notifications. Phones use push.native.ts.

export async function registerForPush(): Promise<void> {}

export async function unregisterForPush(): Promise<void> {}

export function handlePushTaps(): () => void {
  return () => {};
}
