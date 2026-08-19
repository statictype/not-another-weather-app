import { SearchIcon } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Input } from "@/components/ui/input";
import { SearchError } from "./search-error";
import type { UseSearchMenuReturn } from "./use-search-menu";

interface SearchFieldProps {
  id: string;
  errorId: string;
  errorMessage: string | null;
  /** True while a selection is in flight. */
  disabled: boolean;
  autoFocus: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: UseSearchMenuReturn["inputProps"];
  formProps: UseSearchMenuReturn["formProps"];
  /** Leading slot in the field row — the space the nav mark occupies. */
  leading?: ReactNode;
  /** Trailing slot in the field row — the panel's close control. */
  trailing?: ReactNode;
}

export function SearchField({
  id,
  errorId,
  errorMessage,
  disabled,
  autoFocus,
  inputRef,
  inputProps,
  formProps,
  leading,
  trailing,
}: SearchFieldProps) {
  return (
    <search>
      <form {...formProps}>
        <label htmlFor={id} className="sr-only">
          Search city
        </label>

        <div className="flex items-center gap-3">
          {leading}
          <div className="search-surface flex h-13 min-w-0 flex-1 items-center gap-3 rounded-[1.75rem] px-5">
            <SearchIcon
              className="size-5 shrink-0 text-foreground/70"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              id={id}
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search a city…"
              disabled={disabled}
              autoFocus={autoFocus}
              {...inputProps}
              aria-describedby={errorMessage ? errorId : undefined}
              className="placeholder:text-foreground/70 h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-xl font-normal tracking-tight shadow-none focus-visible:ring-0 disabled:opacity-100"
            />
          </div>
          {trailing}
        </div>

        <SearchError id={errorId} message={errorMessage} />
      </form>
    </search>
  );
}
