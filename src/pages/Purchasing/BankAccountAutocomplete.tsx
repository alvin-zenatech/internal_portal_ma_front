import React, { useState, useRef, useEffect, useMemo } from "react";
import { useGLCodes } from "@/hooks/usePurchasing";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Check, Landmark, CreditCard } from "lucide-react";
import type { GLCodeOption } from "@/types/chartOfAccount";
import {
  parseGLAccount,
  isBankAccountOption,
  formatBankAccountDisplay,
  expandBankName,
} from "@/utils/glAccountUtils";

export interface BankAccountAutocompleteProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function BankAccountAutocomplete({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "Select Bank Account *",
}: BankAccountAutocompleteProps) {
  const { data: glCodes = [], isLoading } = useGLCodes();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Only bank and credit card accounts
  const bankOptions = useMemo(() => {
    return glCodes.filter((item) => isBankAccountOption(item));
  }, [glCodes]);

  const selectedDisplay = useMemo(() => {
    if (!value || value === "—" || value === "-") return null;
    const parsed = parseGLAccount(value, glCodes);
    let bankName = expandBankName(parsed?.bank_name || parsed?.account_name);
    let last4 = parsed?.bank_account_last4 ?? null;
    let subsidiary = parsed?.subsidiary ?? null;
    let isCC = parsed?.is_credit_card ?? false;

    if (!bankName && !last4) {
      const parts = String(value).split(" - ");
      if (parts.length >= 2) {
        bankName = expandBankName(parts[0].trim());
        last4 = parts[1].trim();
        subsidiary = parts.slice(2).join(" - ").trim() || null;
      } else {
        bankName = expandBankName(String(value));
      }
    }

    if (!bankName && !last4) return null;
    return {
      bank_name: bankName || (last4 ? `Account ${last4}` : String(value)),
      last4,
      subsidiary,
      is_credit_card: isCC,
    };
  }, [value, glCodes]);

  const filteredOptions = useMemo(() => {
    if (!search) return bankOptions;
    const q = search.toLowerCase().trim();
    return bankOptions.filter((item) => {
      const parsed = parseGLAccount(item.account_number, glCodes);
      const formatted = formatBankAccountDisplay(item, glCodes).toLowerCase();
      const name = (item.account_name || "").toLowerCase();
      const bankName = (expandBankName(parsed?.bank_name) || "").toLowerCase();
      const last4 = parsed?.bank_account_last4 || "";
      const sub = (parsed?.subsidiary || "").toLowerCase();

      return (
        formatted.includes(q) ||
        name.includes(q) ||
        bankName.includes(q) ||
        last4.includes(q) ||
        sub.includes(q)
      );
    });
  }, [bankOptions, search, glCodes]);

  const handleSelect = (option: GLCodeOption) => {
    const formatted = formatBankAccountDisplay(option, glCodes);
    onChange(formatted || option.account_name);
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
        className={`flex items-center justify-between h-10 px-3 rounded-lg border text-sm transition-colors cursor-pointer bg-background ${
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-slate-400 dark:hover:border-zinc-600"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-muted" : ""}`}
      >
        {selectedDisplay ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-100 text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0">
              {selectedDisplay.is_credit_card ? (
                <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              ) : (
                <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              <span className="truncate max-w-[200px]">{selectedDisplay.bank_name}</span>
            </span>
            {selectedDisplay.last4 && (
              <span className="font-mono font-medium text-amber-800 dark:text-amber-300 text-xs bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded shrink-0">
                •••• {selectedDisplay.last4}
              </span>
            )}
            {selectedDisplay.subsidiary && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 shrink-0 truncate max-w-[140px]"
              >
                {selectedDisplay.subsidiary}
              </Badge>
            )}
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

      {/* In-place Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 w-full min-w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
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
              placeholder="Filter bank name, account last 4, or entity..."
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-zinc-800/60">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Loading bank accounts...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No bank accounts match "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const parsedOpt = parseGLAccount(opt.account_number, glCodes);
                const displayStr = formatBankAccountDisplay(opt, glCodes);
                const optBankName = expandBankName(parsedOpt?.bank_name) || opt.account_name;
                const isSelected =
                  value === displayStr ||
                  value === opt.account_name ||
                  value === opt.account_number;
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
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 shrink-0">
                        {parsedOpt?.is_credit_card ? (
                          <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                        <span>{optBankName}</span>
                      </span>

                      {parsedOpt?.bank_account_last4 && (
                        <span className="font-mono font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                          •••• {parsedOpt.bank_account_last4}
                        </span>
                      )}

                      {parsedOpt?.subsidiary && (
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                          {parsedOpt.subsidiary}
                        </span>
                      )}

                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 font-normal shrink-0 text-slate-400 ml-auto"
                      >
                        {parsedOpt?.is_credit_card ? "Credit Card" : "Bank"}
                      </Badge>
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                    )}
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

export default BankAccountAutocomplete;
