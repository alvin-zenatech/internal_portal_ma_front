import React, { useState, useRef, useEffect } from "react";
import { useGLCodes } from "@/hooks/usePurchasing";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Check, Landmark } from "lucide-react";
import type { GLCodeOption } from "@/types/chartOfAccount";
import { parseGLAccount } from "@/utils/glAccountUtils";

interface GLCodeAutocompleteProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showDetailCard?: boolean;
}

export function GLCodeAutocomplete({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "Select GL Code / Account *",
  showDetailCard = true,
}: GLCodeAutocompleteProps) {
  const { data: glCodes = [], isLoading } = useGLCodes();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const parsedSelected = parseGLAccount(value, glCodes);

  const filteredOptions = glCodes.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    const parsed = parseGLAccount(item.account_number, glCodes);
    return (
      item.account_number.toLowerCase().includes(q) ||
      item.account_name.toLowerCase().includes(q) ||
      (item.account_type && item.account_type.toLowerCase().includes(q)) ||
      (parsed?.bank_name && parsed.bank_name.toLowerCase().includes(q)) ||
      (parsed?.bank_account_last4 && parsed.bank_account_last4.includes(q)) ||
      (parsed?.subsidiary && parsed.subsidiary.toLowerCase().includes(q))
    );
  });

  const handleSelect = (option: GLCodeOption) => {
    onChange(option.account_number);
    setSearch("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger / Input Display */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between min-h-[40px] px-3 py-1.5 rounded-md border text-sm transition-colors cursor-pointer bg-background ${
          isOpen
            ? "border-primary ring-1 ring-primary/30"
            : "border-input hover:border-slate-400 dark:hover:border-zinc-600"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-muted" : ""}`}
      >
        {parsedSelected ? (
          parsedSelected.is_bank_account && (parsedSelected.bank_name || parsedSelected.bank_account_last4) ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
              <span className="font-semibold text-blue-700 dark:text-blue-300 font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 shrink-0">
                GL {parsedSelected.account_number}
              </span>
              {parsedSelected.bank_name && (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-100 text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{parsedSelected.bank_name}</span>
                </span>
              )}
              {parsedSelected.bank_account_last4 && (
                <span className="font-mono font-medium text-amber-800 dark:text-amber-300 text-xs bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded shrink-0">
                  •••• {parsedSelected.bank_account_last4}
                </span>
              )}
              {parsedSelected.subsidiary && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 shrink-0">
                  {parsedSelected.subsidiary}
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
              <span className="font-semibold text-slate-800 dark:text-zinc-100 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0">
                {parsedSelected.account_number}
              </span>
              <span className="truncate text-slate-700 dark:text-zinc-200 font-medium text-xs">
                {parsedSelected.account_name}
              </span>
              {parsedSelected.account_type && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal shrink-0 text-slate-500">
                  {parsedSelected.account_type}
                </Badge>
              )}
            </div>
          )
        ) : value ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-slate-800 dark:text-zinc-100 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border shrink-0">
              {value}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">{placeholder}</span>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Structured Read-only Breakdown for 10xx Bank Account */}
      {showDetailCard && parsedSelected?.is_bank_account && (parsedSelected.bank_name || parsedSelected.bank_account_last4) && (
        <div className="mt-1.5 p-2 rounded-md bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in-50 duration-150">
          <div>
            <span className="text-slate-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">GL Code</span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{parsedSelected.account_number}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">Bank Name</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-1">
              <Landmark className="w-3 h-3 text-blue-600 shrink-0" />
              {parsedSelected.bank_name || "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">Account (Last 4)</span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
              {parsedSelected.bank_account_last4 ? `•••• ${parsedSelected.bank_account_last4}` : "—"}
            </span>
          </div>
          {parsedSelected.subsidiary && (
            <div className="col-span-2 sm:col-span-3">
              <span className="text-slate-500 dark:text-zinc-400 block text-[10px] uppercase font-semibold">Entity / Subsidiary</span>
              <span className="font-medium text-purple-700 dark:text-purple-300">{parsedSelected.subsidiary}</span>
            </div>
          )}
        </div>
      )}

      {/* In-place Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 min-w-[340px] max-w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-popover text-popover-foreground shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Filter by code (e.g. 1042), bank (BOA), acct (9572), or name..."
              className="h-8 text-xs bg-background"
            />
          </div>

          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-zinc-800/60"
          >
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading GL codes...</div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No GL codes match "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const parsedOpt = parseGLAccount(opt.account_number, glCodes);
                const isSelected = value === opt.account_number;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <div
                    key={opt.account_number}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : isHighlighted
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-slate-700 dark:text-zinc-200"
                    }`}
                  >
                    {parsedOpt?.is_bank_account && (parsedOpt.bank_name || parsedOpt.bank_account_last4) ? (
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                        <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 shrink-0">
                          {parsedOpt.account_number}
                        </span>
                        {parsedOpt.bank_name && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 shrink-0">
                            <Landmark className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>{parsedOpt.bank_name}</span>
                          </span>
                        )}
                        {parsedOpt.bank_account_last4 && (
                          <span className="font-mono font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                            •••• {parsedOpt.bank_account_last4}
                          </span>
                        )}
                        {parsedOpt.subsidiary && (
                          <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                            {parsedOpt.subsidiary}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal shrink-0 text-slate-400 ml-auto">
                          Bank
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border text-slate-900 dark:text-zinc-100 shrink-0">
                          {opt.account_number}
                        </span>
                        <span className="truncate">{opt.account_name}</span>
                        {opt.account_type && (
                          <span className="text-[10px] text-muted-foreground shrink-0 italic ml-auto">
                            ({opt.account_type})
                          </span>
                        )}
                      </div>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GLCodeAutocomplete;
