import { useLayoutEffect, useRef } from "react";
import { useUnitSystem } from "@/hooks/use-unit-system";
import { scrambleTo } from "@/lib/scramble";
import { cn } from "@/lib/utils";

interface UnitValueProps {
  /** An already-formatted display string — `read(pair, system).text`, or one
   *  of its parts where a tile sets the value and the suffix apart. */
  text: string;
  /** Milliseconds after the toggle before this reading starts. See `sweep`. */
  delay?: number;
  className?: string;
}

/**
 * A reading that churns when the unit system changes.
 *
 * Only the unit system triggers it. A new city or a refetch replaces the text
 * outright, because those numbers are a different reading rather than the same
 * one restated. A value that reads the same in both systems — a percentage, the
 * Beaufort word — never moves, so call sites can wrap everything in a list
 * without sorting the unit-bearing rows out first.
 */
export function UnitValue({ text, delay = 0, className }: UnitValueProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const system = useUnitSystem();
  const prev = useRef({ system, text });

  useLayoutEffect(() => {
    const node = ref.current;
    const was = prev.current;
    prev.current = { system, text };
    if (!node || was.system === system || was.text === text) return;
    return scrambleTo(node, was.text, text, delay);
  }, [system, text, delay]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </span>
  );
}
