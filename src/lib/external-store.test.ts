import { describe, expect, it, vi } from "vitest";
import { createSubscription } from "./external-store";

describe("createSubscription", () => {
  it("notifies every current subscriber", () => {
    const sub = createSubscription();
    const a = vi.fn();
    const b = vi.fn();
    sub.subscribe(a);
    sub.subscribe(b);
    sub.notify();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("stops notifying a listener after it unsubscribes", () => {
    const sub = createSubscription();
    const a = vi.fn();
    const unsub = sub.subscribe(a);
    unsub();
    sub.notify();
    expect(a).not.toHaveBeenCalled();
  });

  it("attaches the source once on the first subscriber and not again on later ones", () => {
    const detach = vi.fn();
    const attach = vi.fn(() => detach);
    const sub = createSubscription(attach);
    sub.subscribe(vi.fn());
    sub.subscribe(vi.fn());
    expect(attach).toHaveBeenCalledTimes(1);
    expect(detach).not.toHaveBeenCalled();
  });

  it("detaches the source only when the last subscriber leaves", () => {
    const detach = vi.fn();
    const sub = createSubscription(() => detach);
    const unsubA = sub.subscribe(vi.fn());
    const unsubB = sub.subscribe(vi.fn());
    unsubA();
    expect(detach).not.toHaveBeenCalled();
    unsubB();
    expect(detach).toHaveBeenCalledTimes(1);
  });

  it("re-attaches the source if a subscriber arrives after going empty", () => {
    const attach = vi.fn(() => vi.fn());
    const sub = createSubscription(attach);
    sub.subscribe(vi.fn())();
    sub.subscribe(vi.fn());
    expect(attach).toHaveBeenCalledTimes(2);
  });

  it("routes source events through notify", () => {
    let fire = () => {};
    const sub = createSubscription((onChange) => {
      fire = onChange;
      return () => {};
    });
    const a = vi.fn();
    sub.subscribe(a);
    fire();
    expect(a).toHaveBeenCalledTimes(1);
  });
});
