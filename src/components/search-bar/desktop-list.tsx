import { LocateFixedIcon, ShuffleIcon, XIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import { motion } from "motion/react";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { MIN_SUGGESTION_LENGTH } from "./constants";
import type { NavigableItem } from "./navigable";
import { SectionHeader } from "./section-header";

const ClearAllButton = lazy(() => import("./clear-all-button"));

const PILL_TRANSITION = {
  type: "spring" as const,
  stiffness: 480,
  damping: 36,
  mass: 0.7,
};

interface DesktopListProps {
  navigableItems: NavigableItem[];
  focusedKey: string | null;
  setFocusedKey: (key: string | null) => void;
  trimmed: string;
  isSuggestionsLoading: boolean;
  showSelectPrompt: boolean;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  clearDialogOpen: boolean;
  onClearDialogOpenChange: (open: boolean) => void;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
}

export function DesktopList(props: DesktopListProps) {
  const recents = props.navigableItems.filter((i) => i.kind === "recent");
  const suggestions = props.navigableItems.filter((i) => i.kind === "suggestion");
  const actions = props.navigableItems.filter((i) => i.kind === "action");

  const len = props.trimmed.length;
  const showKeepTypingHint = len > 0 && len < MIN_SUGGESTION_LENGTH && suggestions.length === 0;
  const showNoResults =
    len >= MIN_SUGGESTION_LENGTH &&
    !props.isSuggestionsLoading &&
    suggestions.length === 0 &&
    recents.length === 0;

  return (
    <div className="flex max-h-[460px] flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
        {recents.length > 0 && (
          <section className="mb-3">
            <div className="mb-2 flex items-center justify-between px-3 py-2">
              <SectionHeader label="Recent" />
              <Suspense fallback={null}>
                <ClearAllButton
                  onConfirm={props.onRecentClearAll}
                  open={props.clearDialogOpen}
                  onOpenChange={props.onClearDialogOpenChange}
                />
              </Suspense>
            </div>
            <ul className="flex flex-col">
              {recents.map((nav) => {
                if (nav.kind !== "recent") return null;
                return (
                  <RecentRow
                    key={nav.key}
                    nav={nav}
                    focused={props.focusedKey === nav.key}
                    setFocusedKey={props.setFocusedKey}
                    onSelect={props.onRecentSelect}
                    onRemove={props.onRecentRemove}
                  />
                );
              })}
            </ul>
          </section>
        )}

        {len >= MIN_SUGGESTION_LENGTH && (
          <section>
            <div className="mb-1.5 px-3">
              <SectionHeader label="Suggestions" />
            </div>
            {props.isSuggestionsLoading ? (
              <SuggestionLoadingRows />
            ) : (
              <ul className="flex flex-col">
                {suggestions.map((nav) => {
                  if (nav.kind !== "suggestion") return null;
                  return (
                    <SuggestionRow
                      key={nav.key}
                      nav={nav}
                      focused={props.focusedKey === nav.key}
                      setFocusedKey={props.setFocusedKey}
                      onSelect={props.onSuggestionSelect}
                    />
                  );
                })}
              </ul>
            )}
            {showNoResults && (
              <div className="px-3 py-4">
                <p className="text-sm font-medium text-foreground/55">No cities found</p>
                <p className="mt-0.5 text-xs text-foreground/35">Try a different spelling</p>
              </div>
            )}
          </section>
        )}

        {showKeepTypingHint && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-foreground/40">
              Keep typing for city suggestions…
            </p>
          </div>
        )}
      </div>

      <ActionFooter
        actions={actions}
        focusedKey={props.focusedKey}
        setFocusedKey={props.setFocusedKey}
        onLocationRequest={props.onLocationRequest}
        onRandomSelect={props.onRandomSelect}
        showSelectPrompt={props.showSelectPrompt}
      />
    </div>
  );
}

// ─── Action footer ───────────────────────────────────────────────────

interface ActionFooterProps {
  actions: NavigableItem[];
  focusedKey: string | null;
  setFocusedKey: (key: string | null) => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
  showSelectPrompt: boolean;
}

function ActionFooter({
  actions,
  focusedKey,
  setFocusedKey,
  onLocationRequest,
  onRandomSelect,
  showSelectPrompt,
}: ActionFooterProps) {
  if (showSelectPrompt) {
    return (
      <div className="search-action-footer flex shrink-0 items-center justify-center px-5 py-3.5">
        <p role="alert" className="text-xs font-medium text-destructive">
          Select a city from the list
        </p>
      </div>
    );
  }

  return (
    <ul className="search-action-footer flex shrink-0 items-stretch">
      {actions.map((nav, idx) => {
        if (nav.kind !== "action") return null;
        return (
          <ActionButton
            key={nav.key}
            nav={nav}
            focused={focusedKey === nav.key}
            setFocusedKey={setFocusedKey}
            onLocationRequest={onLocationRequest}
            onRandomSelect={onRandomSelect}
            withDivider={idx > 0}
          />
        );
      })}
    </ul>
  );
}

// ─── Row primitives ──────────────────────────────────────────────────

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

interface RecentRowProps {
  nav: Extract<NavigableItem, { kind: "recent" }>;
  focused: boolean;
  setFocusedKey: (key: string | null) => void;
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
}

function RecentRow({ nav, focused, setFocusedKey, onSelect, onRemove }: RecentRowProps) {
  return (
    <li className="relative" onMouseEnter={() => setFocusedKey(nav.key)}>
      {focused && <FocusPill />}
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onMouseDown={(e) => {
          e.preventDefault();
          onSelect(nav.item);
        }}
        className="relative flex w-full items-center px-3 py-3 pr-11 text-left focus-visible:outline-none"
        aria-label={`Load weather for ${nav.item.displayName}`}
      >
        <span
          className={
            "font-display flex-1 truncate text-[15px] font-medium tracking-tight transition-colors duration-150" +
            (focused ? " text-foreground" : " text-foreground/75")
          }
        >
          {nav.item.displayName}
        </span>
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(nav.item);
        }}
        animate={{ opacity: focused ? 1 : 0 }}
        transition={focused ? PILL_TRANSITION : { duration: 0 }}
        className="absolute right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/40 transition-colors duration-150 hover:bg-foreground/[0.08] hover:text-foreground/70 focus-visible:outline-none"
        aria-label={`Remove ${nav.item.displayName} from history`}
      >
        <XIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      </motion.button>
    </li>
  );
}

interface SuggestionRowProps {
  nav: Extract<NavigableItem, { kind: "suggestion" }>;
  focused: boolean;
  setFocusedKey: (key: string | null) => void;
  onSelect: (item: SuggestionItem) => void;
}

function SuggestionRow({ nav, focused, setFocusedKey, onSelect }: SuggestionRowProps) {
  const city = nav.item.name;
  const rest = [nav.item.region, nav.item.country].filter(Boolean).join(", ");

  return (
    <li className="relative">
      {focused && <FocusPill />}
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onMouseEnter={() => setFocusedKey(nav.key)}
        onMouseDown={(e) => {
          e.preventDefault();
          onSelect(nav.item);
        }}
        className="relative flex w-full items-center px-3 py-3 text-left focus-visible:outline-none"
        aria-label={`Search weather for ${city}, ${rest}`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={
              "font-display truncate text-[15px] font-medium tracking-tight transition-colors duration-150" +
              (focused ? " text-foreground" : " text-foreground/80")
            }
          >
            {city}
          </span>
          {rest && <span className="truncate text-xs text-foreground/45">{rest}</span>}
        </span>
      </motion.button>
    </li>
  );
}

interface ActionButtonProps {
  nav: Extract<NavigableItem, { kind: "action" }>;
  focused: boolean;
  setFocusedKey: (key: string | null) => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
  withDivider: boolean;
}

function ActionButton({
  nav,
  focused,
  setFocusedKey,
  onLocationRequest,
  onRandomSelect,
  withDivider,
}: ActionButtonProps) {
  const handler = nav.action === "location" ? onLocationRequest : onRandomSelect;
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
        onMouseEnter={() => setFocusedKey(nav.key)}
        onMouseDown={(e) => {
          e.preventDefault();
          handler();
        }}
        className="group flex h-full w-full items-center justify-center gap-2 px-3 py-3.5 focus-visible:outline-none"
      >
        <Icon
          className={
            "size-4 shrink-0 text-foreground/45 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-180 " +
            (focused ? "rotate-180" : "")
          }
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

// ─── Suggestion loading skeleton ─────────────────────────────────────

function SuggestionLoadingRows() {
  return (
    <ul className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="h-3.5 w-40 animate-pulse rounded-md bg-foreground/[0.06]" />
            <span className="h-2.5 w-24 animate-pulse rounded-md bg-foreground/[0.04]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
