import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus, X, Loader2 } from "lucide-react";

interface CreatableComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  options?: string[];
  fetchOptions?: () => Promise<string[]>;
  placeholder?: string;
  addLabelPrefix?: string;
  entityTypeLabel?: string;
  icon?: React.ReactNode;
  hasError?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  name?: string;
}

export function CreatableCombobox({
  value = "",
  onChange,
  options: initialOptions = [],
  fetchOptions,
  placeholder = "Type or select...",
  addLabelPrefix = "Add new",
  entityTypeLabel = "item",
  icon,
  hasError = false,
  disabled = false,
  className = "",
  required = false,
  name,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [optionsList, setOptionsList] = useState<string[]>(initialOptions);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Keep internal query synchronized with external value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Keep options synchronized when initialOptions changes
  useEffect(() => {
    if (initialOptions && initialOptions.length > 0) {
      setOptionsList((prev) => {
        const merged = Array.from(new Set([...initialOptions, ...prev]));
        return merged.filter(Boolean);
      });
    }
  }, [initialOptions]);

  const loadRemoteOptions = () => {
    if (!fetchOptions) return;
    setIsLoading(true);
    fetchOptions()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOptionsList((prev) => {
            const merged = Array.from(new Set([...prev, ...data]));
            return merged.filter(Boolean);
          });
        }
      })
      .catch((err) => {
        console.debug("Failed to load options:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadRemoteOptions();
  }, [fetchOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!trimmedQuery) return optionsList;
    const lower = trimmedQuery.toLowerCase();
    return optionsList.filter((opt) => opt.toLowerCase().includes(lower));
  }, [optionsList, trimmedQuery]);

  // Check if query is an exact match for an existing option
  const isExactMatch = useMemo(() => {
    if (!trimmedQuery) return false;
    return optionsList.some(
      (opt) => opt.toLowerCase() === trimmedQuery.toLowerCase()
    );
  }, [optionsList, trimmedQuery]);

  // Should we show the "+ Create new" button?
  const showAddOption = trimmedQuery.length > 0 && !isExactMatch;
  const totalItemsCount = (showAddOption ? 1 : 0) + filteredOptions.length;

  const selectOption = (val: string) => {
    setQuery(val);
    onChange(val);
    setOpen(false);
  };

  const handleAddNew = () => {
    if (!trimmedQuery) return;
    if (!optionsList.includes(trimmedQuery)) {
      setOptionsList((prev) => [trimmedQuery, ...prev]);
    }
    selectOption(trimmedQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        if (optionsList.length === 0) loadRemoteOptions();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < totalItemsCount - 1 ? prev + 1 : 0;
        itemRefs.current.get(next)?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : Math.max(0, totalItemsCount - 1);
        itemRefs.current.get(next)?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showAddOption && highlightedIndex === 0) {
        handleAddNew();
      } else {
        const optionIndex = showAddOption ? highlightedIndex - 1 : highlightedIndex;
        if (filteredOptions[optionIndex]) {
          selectOption(filteredOptions[optionIndex]);
        } else if (showAddOption) {
          handleAddNew();
        } else if (trimmedQuery) {
          selectOption(trimmedQuery);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <Input
          ref={inputRef}
          name={name}
          required={required}
          disabled={disabled}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val);
            setHighlightedIndex(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setHighlightedIndex(0);
            if (optionsList.length === 0) {
              loadRemoteOptions();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`h-9 text-xs font-medium bg-slate-50/50 dark:bg-zinc-800/50 transition-all ${
            icon ? "pl-8" : "pl-3"
          } ${query ? "pr-14" : "pr-8"} ${
            hasError ? "border-red-500 focus-visible:ring-red-500" : ""
          } ${className}`}
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 mr-1" />
          )}
          {query && !disabled && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onChange("");
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                const nextOpen = !open;
                setOpen(nextOpen);
                if (nextOpen && optionsList.length === 0) {
                  loadRemoteOptions();
                }
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded transition-colors"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </div>

      {open && (
        <div
          data-radix-scroll-lock-ignore=""
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Header info badge if query is typed */}
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
            <span>
              {query ? (
                <>
                  Searching:{" "}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {query}
                  </strong>
                </>
              ) : (
                <>Known {entityTypeLabel}s</>
              )}
            </span>
            <span className="text-[10px] text-slate-400">
              {isLoading ? "Loading..." : `${filteredOptions.length} available`}
            </span>
          </div>

          <div
            ref={listRef}
            data-radix-scroll-lock-ignore=""
            tabIndex={-1}
            style={{
              scrollbarWidth: "thin",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
            className="max-h-56 overflow-y-auto overscroll-contain py-1 text-xs"
          >
            {/* + Add New Option if not exact match */}
            {showAddOption && (
              <button
                ref={(el) => {
                  if (el) itemRefs.current.set(0, el);
                  else itemRefs.current.delete(0);
                }}
                type="button"
                onClick={handleAddNew}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-900/40 font-medium transition-colors ${
                  highlightedIndex === 0
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40"
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 truncate">
                  <span>{addLabelPrefix} </span>
                  <span className="font-bold underline decoration-indigo-400 underline-offset-2">
                    "{trimmedQuery}"
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-300 px-1.5 py-0 h-4"
                >
                  New
                </Badge>
              </button>
            )}

            {/* Existing Options */}
            {filteredOptions.map((opt, idx) => {
              const itemGlobalIndex = showAddOption ? idx + 1 : idx;
              const isSelected =
                value?.trim().toLowerCase() === opt.trim().toLowerCase();
              const isHighlighted = highlightedIndex === itemGlobalIndex;

              return (
                <button
                  key={opt}
                  ref={(el) => {
                    if (el) itemRefs.current.set(itemGlobalIndex, el);
                    else itemRefs.current.delete(itemGlobalIndex);
                  }}
                  type="button"
                  onClick={() => selectOption(opt)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                    isHighlighted
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-medium"
                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                  } ${
                    isSelected
                      ? "font-semibold text-indigo-600 dark:text-indigo-400"
                      : ""
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {/* Loading indicator if loading and empty */}
            {isLoading && filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading {entityTypeLabel.toLowerCase()}s...</span>
              </div>
            )}

            {/* No matches and no add option */}
            {!isLoading &&
              filteredOptions.length === 0 &&
              !showAddOption && (
                <div className="px-3 py-4 text-center text-slate-400 text-xs">
                  No matching {entityTypeLabel.toLowerCase()}s found
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
