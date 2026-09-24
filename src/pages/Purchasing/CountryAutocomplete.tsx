import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check, ChevronsUpDown, Globe, Sparkles } from "lucide-react";
import { getBankingCountries, type BankingCountry } from "@/services/purchasingService";

const POPULAR_COUNTRIES: BankingCountry[] = [
  { code: "US", name: "United States", flag: "🇺🇸", has_iban: false, in_sepa: false },
  { code: "CA", name: "Canada", flag: "🇨🇦", has_iban: false, in_sepa: false },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", has_iban: true, iban_length: 22, in_sepa: true },
  { code: "DE", name: "Germany", flag: "🇩🇪", has_iban: true, iban_length: 22, in_sepa: true },
  { code: "FR", name: "France", flag: "🇫🇷", has_iban: true, iban_length: 27, in_sepa: true },
  { code: "AU", name: "Australia", flag: "🇦🇺", has_iban: false, in_sepa: false },
  { code: "CN", name: "China", flag: "🇨🇳", has_iban: false, in_sepa: false },
  { code: "MX", name: "Mexico", flag: "🇲🇽", has_iban: false, in_sepa: false },
  { code: "JP", name: "Japan", flag: "🇯🇵", has_iban: false, in_sepa: false },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", has_iban: true, iban_length: 21, in_sepa: true },
];

interface CountryAutocompleteProps {
  value?: string;
  onChange: (countryName: string, countryCode?: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CountryAutocomplete({
  value = "",
  onChange,
  disabled = false,
  className = "",
  placeholder = "Select bank country...",
}: CountryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<BankingCountry[]>(POPULAR_COUNTRIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    getBankingCountries()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCountries(data);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch banking countries, using local fallback:", err);
      });
  }, []);

  const selectedCountry = useMemo(() => {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    return (
      countries.find(
        (c) => c.code.toLowerCase() === v || c.name.toLowerCase() === v
      ) || null
    );
  }, [value, countries]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  // Focus input and reset search when opening
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Click outside and Escape key to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Explicit non-passive wheel listener for guaranteed smooth mouse-wheel scrolling
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
  }, [open, filteredCountries]);

  const handleSelect = (country: BankingCountry | string) => {
    if (typeof country === "string") {
      onChange(country);
    } else {
      onChange(country.name, country.code);
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCountries.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredCountries.length - 1 ? prev + 1 : 0;
        const target = filteredCountries[next];
        if (target) {
          itemRefs.current.get(target.code)?.scrollIntoView({ block: "nearest" });
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredCountries.length - 1;
        const target = filteredCountries[next];
        if (target) {
          itemRefs.current.get(target.code)?.scrollIntoView({ block: "nearest" });
        }
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelect(filteredCountries[highlightedIndex]);
      } else if (searchQuery.trim()) {
        handleSelect(searchQuery.trim());
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${open ? "z-50" : "z-10"}`}>
      {/* TRIGGER BUTTON */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full justify-between h-9 px-3 text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 font-normal ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedCountry ? (
            <>
              <span className="text-base leading-none shrink-0">
                {selectedCountry.flag || "🌐"}
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[11px] border border-indigo-200/60 dark:border-indigo-800/60">
                {selectedCountry.code}
              </span>
              <span className="truncate text-slate-800 dark:text-zinc-200 font-medium">
                {selectedCountry.name}
              </span>
            </>
          ) : value ? (
            <>
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate text-slate-800 dark:text-zinc-200">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              {placeholder}
            </span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>

      {/* DROPDOWN MENU */}
      {open && (
        <div
          data-radix-scroll-lock-ignore=""
          className="absolute left-0 top-full mt-1 w-[320px] sm:w-[380px] max-w-[90vw] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-3 py-2 bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search country name or code..."
              className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
            />
          </div>

          {/* Quick Popular Pills */}
          {!searchQuery && (
            <div className="p-2 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/40 dark:bg-zinc-900/30 shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 px-1">
                Common Countries
              </div>
              <div className="flex flex-wrap gap-1">
                {POPULAR_COUNTRIES.slice(0, 7).map((c) => {
                  const isSelected = selectedCountry?.code === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scrollable List of Countries */}
          <div
            ref={listRef}
            data-radix-scroll-lock-ignore=""
            className="max-h-64 overflow-y-auto overscroll-contain p-1 divide-y divide-slate-100/50 dark:divide-zinc-800/50"
            style={{
              scrollbarWidth: "thin",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {filteredCountries.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                <p>No country matching "{searchQuery}"</p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchQuery.trim())}
                    className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Use custom entry "{searchQuery.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filteredCountries.map((c, idx) => {
                const isSelected = selectedCountry?.code === c.code;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <button
                    key={c.code + c.name}
                    ref={(el) => {
                      if (el) itemRefs.current.set(c.code, el);
                      else itemRefs.current.delete(c.code);
                    }}
                    type="button"
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 font-medium"
                        : isHighlighted
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base leading-none shrink-0">{c.flag || "🌐"}</span>
                      <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 min-w-[34px] text-center shrink-0">
                        {c.code}
                      </span>
                      <span className="truncate font-medium text-slate-800 dark:text-zinc-200">{c.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {c.has_iban && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                          IBAN
                        </Badge>
                      )}
                      {c.in_sepa && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          SEPA
                        </Badge>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer info */}
          <div className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
            <span>{filteredCountries.length} countries</span>
            <span>Scroll or use ↑/↓ keys</span>
          </div>
        </div>
      )}
    </div>
  );
}
