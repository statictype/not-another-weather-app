/** `subscribeToSource` runs on the first subscriber and tears down on the last. */
export interface Subscription {
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
}

export function createSubscription(
  subscribeToSource?: (onChange: () => void) => () => void,
): Subscription {
  const listeners = new Set<() => void>();
  let detachSource: (() => void) | null = null;

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (subscribeToSource && detachSource === null && listeners.size === 1) {
      detachSource = subscribeToSource(notify);
    }
    return () => {
      listeners.delete(listener);
      if (detachSource && listeners.size === 0) {
        detachSource();
        detachSource = null;
      }
    };
  }

  return { subscribe, notify };
}
