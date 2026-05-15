import { ClockIcon, XIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { HistoryItem } from "@/hooks/use-history";
import { SectionHeader } from "./section-header";

const ClearAllButton = lazy(() => import("./clear-all-button"));

const listVariants = {
  visible: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0 },
};

const itemTransition = { type: "spring" as const, stiffness: 500, damping: 35 };

interface RecentSectionProps {
  isMobileOpen: boolean;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
  clearDialogOpen: boolean;
  onClearDialogOpenChange: (open: boolean) => void;
}

export function RecentSection({
  isMobileOpen,
  items,
  onSelect,
  onRemove,
  onClearAll,
  clearDialogOpen,
  onClearDialogOpenChange,
}: RecentSectionProps) {
  return (
    <div>
      <div
        className={
          isMobileOpen
            ? "flex items-center justify-between px-5 pb-2 pt-4"
            : "flex items-center justify-between px-3 pb-1.5 pt-2"
        }
      >
        <SectionHeader label="Recent" />
        <Suspense fallback={<div className="h-7 px-2" />}>
          <ClearAllButton
            onConfirm={onClearAll}
            open={clearDialogOpen}
            onOpenChange={onClearDialogOpenChange}
          />
        </Suspense>
      </div>

      {isMobileOpen ? (
        <motion.ul
          className="flex flex-wrap gap-2.5 px-5 pb-4"
          initial="hidden"
          animate="visible"
          variants={listVariants}
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                variants={itemVariants}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={itemTransition}
                className="max-w-full"
              >
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="font-display flex max-w-full items-center gap-1 rounded-full bg-foreground/[0.1] pl-4 pr-1.5 py-1.5 text-base font-medium tracking-tight text-foreground/80 transition-colors duration-200 active:bg-foreground/[0.15]"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(item);
                    }}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <ClockIcon
                      className="size-3.5 shrink-0 text-foreground/40"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.displayName}</span>
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(item);
                    }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground/30 transition-colors duration-150 hover:bg-foreground/[0.08] hover:text-foreground/60"
                    aria-label={`Remove ${item.displayName} from history`}
                  >
                    <XIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  </motion.button>
                </motion.div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <motion.ul
          className="flex flex-col gap-0.5"
          initial="hidden"
          animate="visible"
          variants={listVariants}
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                variants={itemVariants}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={itemTransition}
                className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-150 hover:bg-foreground/[0.05]"
              >
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item);
                  }}
                  className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none"
                  aria-label={`Load weather for ${item.displayName}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] transition-colors duration-150 group-hover:bg-foreground/[0.08]">
                    <ClockIcon
                      className="size-3.5 text-foreground/40"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-display truncate text-sm font-normal tracking-tight text-foreground/80 transition-colors duration-150 group-hover:text-foreground">
                    {item.displayName}
                  </span>
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onRemove(item);
                  }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground/30 opacity-0 transition-all duration-150 hover:bg-foreground/[0.08] hover:text-foreground/60 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                  aria-label={`Remove ${item.displayName} from history`}
                >
                  <XIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                </motion.button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
