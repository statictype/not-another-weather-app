import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — the standard shadcn class merger.
 * Combines clsx (conditional classes) with tailwind-merge (resolves
 * conflicting Tailwind utilities so the last one wins).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
