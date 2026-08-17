import { useLayoutEffect, useRef } from "react";
import { scrambleTo, WORD_POOLS } from "@/lib/scramble";
import { cn } from "@/lib/utils";

interface ScrambleTextProps {
  text: string;
  /** Milliseconds after the change before this string starts. */
  delay?: number;
  className?: string;
}

/**
 * A word or reading that churns whenever the text it is given changes.
 *
 * The sibling of `UnitValue`, which restates one reading in the other system
 * and so churns against the unit vocabulary. This one replaces a string with a
 * different string, and churns against the full alphabet.
 *
 * First paint never churns — arriving data is not a restatement.
 */
export function ScrambleText({ text, delay = 0, className }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(text);

  useLayoutEffect(() => {
    const node = ref.current;
    const was = prev.current;
    prev.current = text;
    if (!node || was === text) return;
    return scrambleTo(node, was, text, delay, WORD_POOLS);
  }, [text, delay]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </span>
  );
}
