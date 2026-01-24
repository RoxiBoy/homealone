export type CheckInPushListener = () => void;

const listeners = new Set<CheckInPushListener>();

export function onCheckInPush(listener: CheckInPushListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitCheckInPush(): void {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.log('[checkInEvents] Listener error', e);
    }
  });
}
