import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCurrencies } from "@/hooks/usePurchasing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search, Coins, Sparkles } from "lucide-react";
import type { Currency } from "@/types/purchasing";

interface CurrencyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCurrency?: (currency: Currency) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const POPULAR_CURRENCY_CODES = ["USD", "CAD", "EUR", "GBP", "AUD", "JPY", "CNY", "CHF", "SGD", "HKD", "MXN", "INR"];

export function CurrencyAutocomplete({
  value,
  onChange,
  onSelectCurrency,
  disabled = false,
  className = "",
  placeholder = "Select currency...",
}: CurrencyAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { data: currencies = [], isLoading } = useCurrencies();

  // Normalize selected currency code
  const currentCode = (value || "USD").toUpperCase();

  // Find currently selected currency object
  const selectedCurrency = useMemo(() => {
    return currencies.find((c) => c.code.toUpperCase() === currentCode);
  }, [currencies, currentCode]);

  // Filtered currencies based on search
  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currencies;

    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.symbol && c.symbol.toLowerCase().includes(q))
    );
  }, [currencies, searchQuery]);

  const handleSelect = useCallback((code: string) => {
    const upper = code.toUpperCase();
    onChange(upper);
    if (onSelectCurrency) {
      const match = currencies.find((c) => c.code.toUpperCase() === upper);
      if (match) {
        onSelectCurrency(match);
      } else {
        onSelectCurrency({ code: upper, name: upper, symbol: "$" });
      }
    }
    setOpen(false);
  }, [currencies, onChange, onSelectCurrency]);

  // Focus search input and go directly to selected currency when popover opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setHighlightedIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
        if (currentCode) {
          const el = itemRefs.current.get(currentCode);
          if (el) {
            el.scrollIntoView({ block: "nearest" });
          }
        }
      }, 0);
    }
  }, [open, currentCode]);

  const scrollItemIntoView = (index: number) => {
    const curr = filteredCurrencies[index];
    if (curr) {
      const el = itemRefs.current.get(curr.code.toUpperCase());
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredCurrencies.length - 1 ? prev + 1 : 0;
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredCurrencies.length - 1;
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredCurrencies[highlightedIndex]) {
        handleSelect(filteredCurrencies[highlightedIndex].code);
      } else if (searchQuery.trim().length >= 2) {
        handleSelect(searchQuery.trim().toUpperCase());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Explicit non-passive wheel listener for guaranteed smooth mouse-wheel scrolling inside modals
  useEffect(() => {
    const el = listRef.current;
    if (!open || !el) return;

    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop += e.deltaY;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [open, filteredCurrencies]);

  const isCustomCode =
    searchQuery.trim().length >= 2 &&
    !currencies.some((c) => c.code.toUpperCase() === searchQuery.trim().toUpperCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between h-9 px-3 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 font-normal ${className}`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[11px] border border-indigo-200/60 dark:border-indigo-800/60">
              {currentCode}
            </span>
            {selectedCurrency ? (
              <span className="truncate text-slate-700 dark:text-zinc-200">
                {selectedCurrency.name}{" "}
                {selectedCurrency.symbol && (
                  <span className="text-slate-400 font-normal">({selectedCurrency.symbol})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-radix-scroll-lock-ignore=""
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="w-[320px] sm:w-[350px] p-0 shadow-xl z-50 flex flex-col border border-slate-200 dark:border-zinc-800"
        align="start"
      >
        {/* Search header */}
        <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-3 py-2 bg-slate-50/70 dark:bg-zinc-900/70 shrink-0">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search code, name, or symbol..."
            className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
          />
        </div>

        {/* Quick popular pills */}
        {!searchQuery && (
          <div className="p-2 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 px-1">
              Popular Currencies
            </div>
            <div className="flex flex-wrap gap-1">
              {POPULAR_CURRENCY_CODES.map((code) => {
                const isSelected = currentCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white dark:bg-indigo-500 font-bold"
                        : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable list of currencies */}
        <div
          ref={listRef}
          data-radix-scroll-lock-ignore=""
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="max-h-64 sm:max-h-72 overflow-y-auto overscroll-contain p-1 divide-y divide-slate-100/50 dark:divide-zinc-800/50"
          style={{
            scrollbarWidth: "thin",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Coins className="h-4 w-4 animate-spin text-indigo-500" />
              Loading currencies...
            </div>
          ) : filteredCurrencies.length === 0 ? (
            <div className="py-6 px-3 text-center text-xs text-muted-foreground">
              <p>No currencies matching "{searchQuery}"</p>
              {isCustomCode && (
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim().toUpperCase())}
                  className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use custom currency "{searchQuery.trim().toUpperCase()}"
                </button>
              )}
            </div>
          ) : (
            filteredCurrencies.map((c, idx) => {
              const upper = c.code.toUpperCase();
              const isSelected = currentCode === upper;
              const isHighlighted = highlightedIndex === idx;

              return (
                <button
                  key={c.code}
                  ref={(el) => {
                    if (el) itemRefs.current.set(upper, el);
                    else itemRefs.current.delete(upper);
                  }}
                  type="button"
                  data-selected={isSelected ? "true" : "false"}
                  onClick={() => handleSelect(c.code)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 font-medium"
                      : isHighlighted
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-800 dark:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 min-w-[42px] text-center shrink-0">
                      {c.code}
                    </span>
                    <div className="min-w-0 truncate">
                      <span className="truncate">{c.name}</span>
                      {c.symbol && (
                        <span className="ml-1.5 text-slate-400 font-mono text-[11px]">
                          ({c.symbol})
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info: currency count */}
        {filteredCurrencies.length > 0 && (
          <div className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
            <span>{filteredCurrencies.length} currencies</span>
            <span>Scroll or use ↑ / ↓ keys</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
