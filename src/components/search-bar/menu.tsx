import { ClockIcon, LocateFixedIcon, MapPinIcon, ShuffleIcon, XIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import { LayoutGroup, motion } from "motion/react";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { cn } from "@/lib/utils";
import type { MenuModel, MenuSection, NavigableItem } from "./menu-model";
import { SectionHeader } from "./section-header";

const ClearAllButton = lazy(() => import("./clear-all-button"));

const PILL_TRANSITION = {
  type: "spring" as const,
  stiffness: 480,
  damping: 36,
  mass: 0.7,
};

interface MenuProps {
  model: MenuModel;
  focusedKey: string | null;
  hoverKey: (key: string | null) => void;
  selectRecent: (item: HistoryItem) => void;
  selectSuggestion: (item: SuggestionItem) => void;
  requestLocation: () => void;
  selectRandom: () => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

/**
 * The menu's contents — one rendering, CSS-driven across breakpoints.
 *
 * The chrome around it (dropdown panel on desktop, full-screen glass
 * overlay on mobile) is the parent's concern. This component just
 * renders the sections + action footer over the shared `MenuModel`.
 *
 * Visual rules:
 *  - Recents and suggestions are list rows on every breakpoint.
 *  - Suggestion rows always carry the map-pin icon.
 *  - The X "remove" button is always visible on touch (no hover state
 *    to discover it from), hover-to-reveal on desktop.
 *  - The default-focused row gets the springy `FocusPill` highlight
 *    on both — same `layoutId` across renders.
 *  - Action footer is inline with a divider between the two buttons,
 *    slightly larger tap targets on mobile.
 */
export function Menu(props: MenuProps) {
  return (
    <LayoutGroup id="search-menu">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
          {props.model.sections.map((section, idx) => (
            <SectionRenderer key={sectionKey(section, idx)} section={section} {...props} />
          ))}
        </div>
        <ActionFooter {...props} />
      </div>
    </LayoutGroup>
  );
}

function SectionRenderer({ section, ...props }: { section: MenuSection } & MenuProps) {
  if (section.kind === "recent") {
    return (
      <section className="mb-3">
        <div className="mb-2 flex items-center justify-between px-3 py-2">
          <SectionHeader label="Recent" />
          <Suspense fallback={null}>
            <ClearAllButton
              onConfirm={props.onRecentClearAll}
              open={props.isDialogOpen}
              onOpenChange={props.setDialogOpen}
            />
          </Suspense>
        </div>
        <ul className="flex flex-col">
          {section.items.map((item) => (
            <RecentRow
              key={item.id}
              item={item}
              focused={props.focusedKey === `recent:${item.id}`}
              hoverKey={props.hoverKey}
              onSelect={props.selectRecent}
              onRemove={props.onRecentRemove}
            />
          ))}
        </ul>
      </section>
    );
  }

  if (section.kind === "suggestions-loading") {
    return (
      <section>
        <div className="mb-1.5 px-3">
          <SectionHeader label="Suggestions" />
        </div>
        <ul className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04]">
                <MapPinIcon
                  className="size-3.5 text-foreground/15"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="h-3.5 w-40 animate-pulse rounded-md bg-foreground/[0.06]" />
                <span className="h-2.5 w-24 animate-pulse rounded-md bg-foreground/[0.04]" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (section.kind === "suggestions") {
    return (
      <section>
        {section.showHeader && (
          <div className="mb-1.5 px-3">
            <SectionHeader label="Suggestions" />
          </div>
        )}
        <ul className="flex flex-col">
          {section.items.map((item) => (
            <SuggestionRow
              key={item.id}
              item={item}
              focused={props.focusedKey === `suggestion:${item.id}`}
              hoverKey={props.hoverKey}
              onSelect={props.selectSuggestion}
            />
          ))}
        </ul>
      </section>
    );
  }

  if (section.kind === "empty-results") {
    return (
      <div className="px-3 py-4">
        <p className="text-sm font-medium text-foreground/55">No cities found</p>
        <p className="mt-0.5 text-xs text-foreground/35">Try a different spelling</p>
      </div>
    );
  }

  // keep-typing
  return (
    <div className="px-3 py-2">
      <p className="text-xs font-medium text-foreground/40">Keep typing for city suggestions…</p>
    </div>
  );
}

function FocusPill() {
  return (
    <motion.div
      layoutId="search-focus-pill"
      className="search-focus-pill absolute inset-0 rounded-xl"
      transition={PILL_TRANSITION}
      aria-hidden="true"
    />
  );
}

function RecentRow({
  item,
  focused,
  hoverKey,
  onSelect,
  onRemove,
}: {
  item: HistoryItem;
  focused: boolean;
  hoverKey: (key: string | null) => void;
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
}) {
  const navKey = `recent:${item.id}`;
  return (
    <li className="group relative" onMouseEnter={() => hoverKey(navKey)}>
      {focused && <FocusPill />}
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onMouseDown={(e) => {
          e.preventDefault();
          onSelect(item);
        }}
        className="relative flex w-full items-center gap-3 px-3 py-3 pr-11 text-left focus-visible:outline-none"
        aria-label={`Load weather for ${item.displayName}`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] transition-colors duration-150 group-hover:bg-foreground/[0.08]">
          <ClockIcon className="size-3.5 text-foreground/40" strokeWidth={2} aria-hidden="true" />
        </span>
        <span
          className={cn(
            "font-display flex-1 truncate text-[15px] font-medium tracking-tight transition-colors duration-150",
            focused ? "text-foreground" : "text-foreground/80",
          )}
        >
          {item.displayName}
        </span>
      </motion.button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item);
        }}
        className={cn(
          "absolute right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/40 transition-all duration-150 hover:bg-foreground/[0.08] hover:text-foreground/70 focus-visible:outline-none active:scale-90",
          // Mobile: always visible (no hover affordance on touch).
          // Desktop: hover-to-reveal, plus visible when the row is focused.
          "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          focused && "lg:opacity-100",
        )}
        aria-label={`Remove ${item.displayName} from history`}
      >
        <XIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </li>
  );
}

function SuggestionRow({
  item,
  focused,
  hoverKey,
  onSelect,
}: {
  item: SuggestionItem;
  focused: boolean;
  hoverKey: (key: string | null) => void;
  onSelect: (item: SuggestionItem) => void;
}) {
  const navKey = `suggestion:${item.id}`;
  const rest = [item.region, item.country].filter(Boolean).join(", ");
  return (
    <li className="group relative">
      {focused && <FocusPill />}
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onMouseEnter={() => hoverKey(navKey)}
        onMouseDown={(e) => {
          e.preventDefault();
          onSelect(item);
        }}
        className="relative flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline-none"
        aria-label={`Search weather for ${item.name}`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 transition-colors duration-150 group-hover:bg-sky-500/[0.15] [.night_&]:bg-foreground/[0.06] [.night_&]:group-hover:bg-foreground/[0.1]">
          <MapPinIcon
            className="size-3.5 text-sky-600/70 [.night_&]:text-foreground/45"
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "font-display truncate text-[15px] font-medium tracking-tight transition-colors duration-150",
              focused ? "text-foreground" : "text-foreground/80",
            )}
          >
            {item.name}
          </span>
          {rest && <span className="truncate text-xs text-foreground/45">{rest}</span>}
        </span>
      </motion.button>
    </li>
  );
}

function ActionFooter(props: MenuProps) {
  return (
    <ul className="search-action-footer flex shrink-0 items-stretch">
      {props.model.actions.map((nav, idx) => (
        <ActionButton
          key={nav.key}
          nav={nav}
          focused={props.focusedKey === nav.key}
          hoverKey={props.hoverKey}
          requestLocation={props.requestLocation}
          selectRandom={props.selectRandom}
          withDivider={idx > 0}
        />
      ))}
    </ul>
  );
}

function ActionButton({
  nav,
  focused,
  hoverKey,
  requestLocation,
  selectRandom,
  withDivider,
}: {
  nav: NavigableItem;
  focused: boolean;
  hoverKey: (key: string | null) => void;
  requestLocation: () => void;
  selectRandom: () => void;
  withDivider: boolean;
}) {
  if (nav.kind !== "action") return null;
  const handler = nav.action === "location" ? requestLocation : selectRandom;
  const Icon = nav.action === "location" ? LocateFixedIcon : ShuffleIcon;
  const label = nav.action === "location" ? "My location" : "Surprise me";

  return (
    <li className="relative flex flex-1">
      {withDivider && (
        <span
          aria-hidden="true"
          className="search-action-divider absolute left-0 top-1/2 h-5 w-px -translate-y-1/2"
        />
      )}
      <button
        type="button"
        onMouseEnter={() => hoverKey(nav.key)}
        onMouseDown={(e) => {
          e.preventDefault();
          handler();
        }}
        className="group flex h-full w-full items-center justify-center gap-2 px-3 py-4 focus-visible:outline-none lg:py-3.5"
      >
        <Icon
          className={cn(
            "size-4 shrink-0 text-foreground/45 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-180",
            focused && "rotate-180",
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="font-display text-[13px] font-medium tracking-tight text-foreground/65">
          {label}
        </span>
      </button>
    </li>
  );
}

function sectionKey(section: MenuSection, idx: number): string {
  return `${section.kind}-${idx}`;
}
