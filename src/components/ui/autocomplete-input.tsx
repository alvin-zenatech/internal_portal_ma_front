import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import fuzzysort from "fuzzysort";
import { Building2, Plus, Loader2 } from "lucide-react";

export interface AutocompleteInputOption {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: AutocompleteInputOption) => void;
  onCreate?: (name: string) => Promise<any> | void;
  options: AutocompleteInputOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  minChars?: number;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelectOption,
  onCreate,
  options,
  placeholder = "Type company name...",
  disabled = false,
  className,
  autoFocus = false,
  minChars = 1,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute suggestions based on typed input
  const suggestions = useMemo(() => {
    if (!value || value.trim().length < minChars) {
      return [];
    }
    const trimmed = value.trim();
    const fuzzResults = fuzzysort.go(trimmed, options as any, {
      key: "name",
      all: false,
      threshold: -10000,
    } as any);
    
    if (fuzzResults.length === 0) {
      return options
        .filter((o) => o.name.toLowerCase().includes(trimmed.toLowerCase()))
        .slice(0, 50);
    }

    return (fuzzResults as any).map((res: any) => res.obj as AutocompleteInputOption).slice(0, 50);
  }, [value, options, minChars]);

  const exactMatch = useMemo(() => {
    if (!value) return false;
    return options.some(opt => opt.name.toLowerCase() === value.trim().toLowerCase());
  }, [value, options]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: AutocompleteInputOption) => {
    onChange(option.name);
    if (onSelectOption) {
      onSelectOption(option);
    }
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!onCreate || !value.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(value.trim());
      onChange(value.trim());
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    const hasCreate = onCreate && value.trim() && !exactMatch;
    const totalSelectable = suggestions.length + (hasCreate ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < totalSelectable - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : totalSelectable - 1
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      } else if (highlightedIndex === suggestions.length && hasCreate) {
        e.preventDefault();
        handleCreate();
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && !disabled && (
    suggestions.length > 0 || (onCreate && value.trim().length >= minChars && !exactMatch)
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (value?.trim().length >= minChars) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {suggestions.length > 0 ? (
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Suggestions ({suggestions.length})
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No matching company found
            </div>
          )}

          {suggestions.map((option, index) => {
            const isSelected = option.name.toLowerCase() === value.trim().toLowerCase();
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={option.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors",
                  isHighlighted || isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground hover:bg-accent/60"
                )}
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{option.name}</span>
                {isSelected && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Selected
                  </span>
                )}
              </div>
            );
          })}

          {onCreate && value.trim().length >= minChars && !exactMatch && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              className={cn(
                "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none transition-colors mt-1 border-t border-border text-primary font-medium",
                highlightedIndex === suggestions.length ? "bg-primary/15" : "hover:bg-primary/10"
              )}
            >
              {isCreating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className="truncate flex-1">Create "{value.trim()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
