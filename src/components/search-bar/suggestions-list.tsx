import { MapPinIcon } from "lucide-react";
import { motion } from "motion/react";
import type { SuggestionItem } from "@/api/types";
import { SectionHeader } from "./section-header";

interface SuggestionsListProps {
  items: SuggestionItem[];
  showHeader: boolean;
  onSelect: (item: SuggestionItem) => void;
}

const listVariants = {
  visible: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0 },
};

const itemTransition = { type: "spring" as const, stiffness: 500, damping: 35 };

export function SuggestionsList({ items, showHeader, onSelect }: SuggestionsListProps) {
  return (
    <div>
      {showHeader && (
        <div className="px-3 pb-1.5 pt-3">
          <SectionHeader label="Suggestions" />
        </div>
      )}
      <motion.ul
        className="flex flex-col gap-0.5"
        initial="hidden"
        animate="visible"
        variants={listVariants}
      >
        {items.map((item) => {
          const city = item.name;
          const rest = [item.region, item.country].filter(Boolean).join(", ");
          return (
            <motion.li
              key={item.id}
              variants={itemVariants}
              transition={itemTransition}
              className="group"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none"
                aria-label={`Search weather for ${city}, ${rest}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 transition-colors duration-150 group-hover:bg-sky-500/[0.15] [.night_&]:bg-foreground/[0.06] [.night_&]:group-hover:bg-foreground/[0.1]">
                  <MapPinIcon
                    className="size-3.5 text-sky-600/70 [.night_&]:text-foreground/45"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display truncate text-sm font-medium tracking-tight text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                    {city}
                  </span>
                  {rest && <span className="truncate text-xs text-foreground/40">{rest}</span>}
                </span>
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export function SuggestionsLoading() {
  return (
    <ul className="flex flex-col gap-0.5">
      {[1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04]">
            <MapPinIcon
              className="size-3.5 text-foreground/15"
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="h-3.5 w-32 animate-pulse rounded-md bg-foreground/[0.07]" />
            <span className="h-2.5 w-20 animate-pulse rounded-md bg-foreground/[0.04]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
