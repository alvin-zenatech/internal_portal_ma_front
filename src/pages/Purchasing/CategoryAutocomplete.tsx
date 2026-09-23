import React, { useState, useRef, useEffect, useMemo } from "react";
import { useGLCodes } from "@/hooks/usePurchasing";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Check } from "lucide-react";
import type { GLCodeOption } from "@/types/chartOfAccount";
import {
  isBankAccountOption,
  formatCategoryDisplay,
} from "@/utils/glAccountUtils";

export interface CategoryAutocompleteProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CategoryAutocomplete({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "Select Category *",
}: CategoryAutocompleteProps) {
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

  // All other types except Bank and Credit Card
  const categoryOptions = useMemo(() => {
    return glCodes.filter((item) => !isBankAccountOption(item));
  }, [glCodes]);

  const selectedDisplayLabel = useMemo(() => {
    if (!value) return "";
    return formatCategoryDisplay(value, glCodes);
  }, [value, glCodes]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return (
      categoryOptions.find(
        (c) =>
          c.account_number === value ||
          c.account_name === value ||
          c.display_label === value
      ) || null
    );
  }, [value, categoryOptions]);

  const filteredOptions = useMemo(() => {
    if (!search) return categoryOptions;
    const q = search.toLowerCase().trim();
    return categoryOptions.filter((item) => {
      const code = (item.account_number || "").toLowerCase();
      const name = (item.account_name || "").toLowerCase();
      const type = (item.account_type || "").toLowerCase();
      return code.includes(q) || name.includes(q) || type.includes(q);
    });
  }, [categoryOptions, search]);

  const handleSelect = (option: GLCodeOption) => {
    // Keep account_number as stored value for backend GL mapping
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
        className={`flex items-center justify-between h-10 px-3 rounded-lg border text-sm transition-colors cursor-pointer bg-background ${
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-slate-400 dark:hover:border-zinc-600"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-muted" : ""}`}
      >
        {selectedOption ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span className="font-mono font-semibold text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 shrink-0">
              {selectedOption.account_number}
            </span>
            <span className="truncate text-slate-800 dark:text-zinc-100 font-medium text-xs">
              {selectedOption.account_name}
            </span>
            {selectedOption.account_type && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-normal shrink-0 text-slate-500 bg-slate-50 dark:bg-zinc-800 truncate max-w-[150px]"
              >
                {selectedOption.account_type}
              </Badge>
            )}
          </div>
        ) : value ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span className="truncate text-slate-800 dark:text-zinc-100 font-medium text-xs">
              {selectedDisplayLabel}
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
              placeholder="Search by code (e.g. 6010) or category name..."
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-zinc-800/60">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Loading categories...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No categories match "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  value === opt.account_number ||
                  value === opt.account_name ||
                  value === opt.display_label;
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
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs shrink-0">
                        {opt.account_number}
                      </span>
                      <span className="truncate text-slate-800 dark:text-zinc-100 font-medium">
                        {opt.account_name}
                      </span>
                      {opt.account_type && (
                        <span className="text-[10px] text-muted-foreground shrink-0 italic ml-auto">
                          ({opt.account_type})
                        </span>
                      )}
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

export default CategoryAutocomplete;
