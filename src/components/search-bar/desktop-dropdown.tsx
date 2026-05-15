import { LayoutGroup, motion } from "motion/react";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { DesktopList } from "./desktop-list";
import type { NavigableItem } from "./navigable";

interface DesktopDropdownProps {
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

const variants = {
  hidden: { opacity: 0, y: -6, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.985 },
};

export function DesktopDropdown(props: DesktopDropdownProps) {
  return (
    <motion.div
      role="listbox"
      className="search-dropdown-desktop absolute left-0 right-0 top-full z-20 mt-3 flex flex-col overflow-hidden rounded-2xl"
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      style={{ transformOrigin: "top center" }}
    >
      <LayoutGroup id="search-dropdown">
        <DesktopList
          navigableItems={props.navigableItems}
          focusedKey={props.focusedKey}
          setFocusedKey={props.setFocusedKey}
          trimmed={props.trimmed}
          isSuggestionsLoading={props.isSuggestionsLoading}
          showSelectPrompt={props.showSelectPrompt}
          onRecentSelect={props.onRecentSelect}
          onRecentRemove={props.onRecentRemove}
          onRecentClearAll={props.onRecentClearAll}
          clearDialogOpen={props.clearDialogOpen}
          onClearDialogOpenChange={props.onClearDialogOpenChange}
          onSuggestionSelect={props.onSuggestionSelect}
          onLocationRequest={props.onLocationRequest}
          onRandomSelect={props.onRandomSelect}
        />
      </LayoutGroup>
    </motion.div>
  );
}
