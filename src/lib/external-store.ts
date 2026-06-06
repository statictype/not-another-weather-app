/**
 * The listener-set + source-event plumbing behind a `useSyncExternalStore`.
 *
 * Both the history store (localStorage + cross-tab `storage`) and the
 * URL-param store (`popstate`) need the same fiddly bits: a set of React
 * subscribers, a fan-out `notify`, and a single external-event listener that's
 * attached only while something is subscribed. That lives here once; each
 * store supplies its own snapshot logic (a cached array vs. a per-key URL
 * read) and, optionally, how to subscribe to its external source.
 *
 * `subscribeToSource` is invoked with `notify` when the first subscriber
 * arrives and torn down when the last leaves, so there's exactly one source
 * listener regardless of how many components subscribe.
 */
export interface Subscription {
  /** Pass straight to `useSyncExternalStore`. */
  subscribe: (listener: () => void) => () => void;
  /** Re-render every subscriber — call after a local mutation. */
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
