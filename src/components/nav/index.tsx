import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { SuggestionItem } from "@/api/types";
import type { WeatherClientError } from "@/api/weather";
import type { NavigableItem } from "@/components/search-bar/menu-model";
import { suggestionToQuery } from "@/components/search-bar/menu-model";
import { searchErrorMessage } from "@/components/search-bar/search-error-model";
import type { HistoryItem } from "@/hooks/use-history";
import {
  COLLAPSE_SPRING,
  EXPAND_SPRING,
  REDUCED_MOTION_FADE,
  SCRIM_FADE,
} from "@/lib/motion/constants";
import {
  BAR_THICKNESS,
  barGeometry,
  type NavPlacement,
  PANEL_RADIUS,
  NAV_LABEL_CLOSED,
  NAV_LABEL_OPEN,
  NAV_PANEL_ID,
  NAV_ROOT_ID,
  panelGeometry,
} from "./contract";
import { NavBar } from "./nav-bar";
import { NavGeometryContext } from "./nav-geometry";
import { BarLayer, NavMark, PanelLayer } from "./nav-layers";
import { type NavIntent, NavPanel } from "./nav-panel";
import { type PendingSelection, resolveHold, type SettleState } from "./pending-selection";
import { useDismissDrag } from "./use-dismiss-drag";
import { useNavPlacement } from "./use-nav-placement";

/** Closed the bar is a pill; open it takes the dialog corner, or none at all
 *  when it runs edge to edge. A fullscreen panel pulled away from its edge by a
 *  dismiss drag takes the dialog corner too, because its edge is now visible. */
function containerRadius(placement: NavPlacement, isOpen: boolean, isDragging: boolean): number {
  if (!isOpen) return BAR_THICKNESS / 2;
  if (placement.panel === "partial") return PANEL_RADIUS;
  return isDragging ? PANEL_RADIUS : 0;
}

export type { NavIntent };

export interface LocationCallbacks {
  /** The coordinates the fix resolved to. A repeat read of the same position
   *  produces the query already in the URL, which settles the hold at once. */
  onResolve?: (query: string) => void;
  /** Permission denied, or no fix. Stops the panel holding for a city that
   *  will never be requested. */
  onFailure?: () => void;
}

interface NavProps {
  /** `null` is closed. Which intent it holds decides where focus lands. */
  intent: NavIntent | null;
  onOpen: (intent: NavIntent) => void;
  onClose: () => void;
  activeQuery: string | null;
  settle: SettleState;
  error: WeatherClientError | null;
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  onValueChange: (next: string) => void;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  onLocationRequest: (callbacks?: LocationCallbacks) => void;
  /** Returns the city it picked, so the hold knows what it is waiting for. */
  onRandomSelect: () => string;
}

/**
 * One node with two roles. Closed it is the bar: `<nav aria-label="Main">`.
 * Open it is a modal surface carrying `role="dialog"`. The element, its `id`
 * and its `layout` spring are the same in both — the box springs from
 * `barGeometry` to `panelGeometry` and the children reposition inside it.
 *
 * Modal is declared, not portalled. Radix `Dialog` would move the content to
 * `<body>` and own its mount, which would make the panel a different node from
 * the bar. `<main>` carries `inert` instead, so there is nothing to trap focus
 * away from and no focus trap is implemented.
 */
export function Nav(props: NavProps) {
  const placement = useNavPlacement();
  const reduced = useReducedMotion();
  const isOpen = props.intent !== null;

  const searchRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const lastIntentRef = useRef<NavIntent>("search");
  /** Filled by the action wrappers below, read by `commit` in the same tick. */
  const actionQuery = useRef<string | null>(null);

  const [pending, setPending] = useState<PendingSelection | null>(null);

  if (props.intent !== null) lastIntentRef.current = props.intent;

  const status = resolveHold(pending, props.activeQuery, props.settle);
  const errorMessage = searchErrorMessage(props.error, props.activeQuery);

  useEffect(() => {
    if (status === "settled") {
      setPending(null);
      props.onClose();
    } else if (status === "failed") {
      // Settled, unsuccessfully. The panel stays up and renders the message
      // inline; the field goes live again so the next query can be typed.
      setPending(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Focus returns to whatever opened the panel — either trigger, or the empty
  // state's "Search a city" row.
  useEffect(() => {
    if (isOpen) {
      // The panel's own initial focus has already landed by the time this runs,
      // so anything inside the nav is never the opener — the trigger that was
      // clicked is covered by the fallback below.
      const active = document.activeElement as HTMLElement | null;
      openerRef.current = active?.closest(`#${NAV_ROOT_ID}`) ? null : active;
      return;
    }
    setPending(null);
    const opener = openerRef.current;
    openerRef.current = null;
    // A trigger is unmounted for as long as the panel is open, so the element
    // that was focused at open time is usually gone by now. The trigger that
    // has just remounted in its place is the same control.
    const fallback = lastIntentRef.current === "settings" ? settingsRef.current : searchRef.current;
    const target = opener?.isConnected ? opener : fallback;
    target?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const commit = (item: NavigableItem) => {
    const query =
      item.kind === "recent"
        ? item.item.query
        : item.kind === "suggestion"
          ? suggestionToQuery(item.item)
          : actionQuery.current;
    setPending({ key: item.key, query, startQuery: props.activeQuery });
  };

  /** Both orderings are live: a synchronous fix resolves before `commit` runs
   *  and is read off the ref; an async one arrives after and patches `pending`. */
  const resolveAction = (query: string) => {
    actionQuery.current = query;
    setPending((p) => (p && p.query === null ? { ...p, query } : p));
  };

  const requestLocation = () => {
    actionQuery.current = null;
    props.onLocationRequest({
      onResolve: resolveAction,
      onFailure: () => setPending(null),
    });
  };

  const selectRandom = () => {
    resolveAction(props.onRandomSelect());
  };

  const geometry = isOpen ? panelGeometry(placement) : barGeometry(placement);
  const transition = reduced ? REDUCED_MOTION_FADE : isOpen ? EXPAND_SPRING : COLLAPSE_SPRING;

  const dismiss = useDismissDrag({
    axis: placement.drag,
    enabled: isOpen && !reduced,
    onDismiss: props.onClose,
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="nav-scrim"
            className="nav-scrim fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? REDUCED_MOTION_FADE : SCRIM_FADE}
            onClick={props.onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <NavGeometryContext
        value={{ placement, containerIsPanel: isOpen, reduced: reduced === true, transition }}
      >
        <motion.nav
          id={NAV_ROOT_ID}
          layout={!reduced}
          initial={false}
          animate={{ borderRadius: containerRadius(placement, isOpen, dismiss.isDragging) }}
          transition={transition}
          style={{ position: "fixed", ...geometry }}
          className="nav-surface z-50 overflow-hidden"
          data-open={isOpen}
          {...dismiss.containerProps}
          {...(isOpen
            ? { role: "dialog" as const, "aria-modal": true, "aria-label": NAV_LABEL_OPEN }
            : { "aria-label": NAV_LABEL_CLOSED })}
        >
          <div id={NAV_PANEL_ID} className="h-full w-full">
            <AnimatePresence initial={false}>
              {props.intent === null ? (
                <BarLayer key="bar">
                  <NavBar
                    placement={placement}
                    isOpen={false}
                    onOpenSearch={() => props.onOpen("search")}
                    onOpenSettings={() => props.onOpen("settings")}
                    searchRef={searchRef}
                    settingsRef={settingsRef}
                  />
                </BarLayer>
              ) : (
                <PanelLayer key="panel" onPointerDown={dismiss.onPointerDown}>
                  <NavPanel
                    intent={props.intent}
                    placement={placement}
                    recentItems={props.recentItems}
                    suggestions={props.suggestions}
                    isSuggestionsLoading={props.isSuggestionsLoading}
                    errorMessage={errorMessage}
                    pending={pending}
                    onValueChange={props.onValueChange}
                    onSuggestionSelect={props.onSuggestionSelect}
                    onRecentSelect={props.onRecentSelect}
                    onRecentRemove={props.onRecentRemove}
                    onRecentClearAll={props.onRecentClearAll}
                    onLocationRequest={requestLocation}
                    onRandomSelect={selectRandom}
                    onCommit={commit}
                    onClose={props.onClose}
                  />
                </PanelLayer>
              )}
            </AnimatePresence>

            <NavMark isOpen={isOpen} />
          </div>
        </motion.nav>
      </NavGeometryContext>
    </>
  );
}
