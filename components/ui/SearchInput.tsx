"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Loader2, Search, X } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

/**
 * Search field look shared by the map's place search (components/map/SearchBar)
 * and the list's restroom filter: search icon, spinner while loading, and a
 * clear button when there is text.
 */
export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible label (also used as the input's aria-label) */
  label: string;
  loading?: boolean;
  /** Called after the clear button empties the field */
  onClear?: () => void;
  /** Extra classes for the outer wrapper */
  wrapperClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, label, loading = false, onClear, wrapperClassName, className, ...props }, ref) => {
    const { t } = useI18n();
    return (
    <div className={cn("relative flex items-center", wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className={cn(
          // Hide the browser's own clear "x" (we draw our own)
          "h-11 w-full rounded-xl border bg-card pl-9 pr-16 text-base shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none",
          className
        )}
        {...props}
      />
      <div className="absolute right-1.5 flex items-center gap-0.5">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />}
        {value && (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              onClear?.();
            }}
            aria-label={t.search.clear}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
