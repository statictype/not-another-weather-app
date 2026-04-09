import { useEffect, useRef, useState } from "react";

/**
 * Pending-removal state with a time-bounded undo window.
 *
 * Used by both single-item delete and "Clear all". The caller stages the
 * removal (the items are gone from history immediately), then either:
 *   - calls `undo()` before the timeout to restore them, or
 *   - lets the timeout fire, at which point `onCommit` runs (a no-op
 *     hook into analytics/telemetry — we already mutated history).
 *
 * Only one pending removal exists at a time. Staging a new removal
 * commits the previous one immediately so we never silently drop state.
 */

export interface PendingRemoval<T> {
  items: T[];
  /** Human-readable summary used by the toast. */
  label: string;
}

export interface UseUndoReturn<T> {
  pending: PendingRemoval<T> | null;
  /** Stage a removal. The items must already be removed from the source. */
  stage: (removal: PendingRemoval<T>) => void;
  /** Restore the pending removal and clear the timer. */
  undo: () => PendingRemoval<T> | null;
  /** Commit immediately, dropping the pending removal. */
  commit: () => void;
}

const DEFAULT_TIMEOUT_MS = 5000;

export function useUndo<T>(timeoutMs: number = DEFAULT_TIMEOUT_MS): UseUndoReturn<T> {
  const [pending, setPending] = useState<PendingRemoval<T> | null>(null);
  const pendingRef = useRef<PendingRemoval<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const setBoth = (next: PendingRemoval<T> | null) => {
    pendingRef.current = next;
    setPending(next);
  };

  const commit = () => {
    clearTimer();
    setBoth(null);
  };

  const stage = (removal: PendingRemoval<T>) => {
    // Staging a new removal commits any prior one immediately.
    clearTimer();
    setBoth(removal);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setBoth(null);
    }, timeoutMs);
  };

  const undo = (): PendingRemoval<T> | null => {
    clearTimer();
    const restored = pendingRef.current;
    setBoth(null);
    return restored;
  };

  useEffect(() => clearTimer, []);

  return { pending, stage, undo, commit };
}
