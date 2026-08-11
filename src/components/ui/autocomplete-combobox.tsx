import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import fuzzysort from "fuzzysort";

export interface AutocompleteOption {
  id: number;
  name: string;
}

interface AutocompleteComboboxProps {
  value: number | "";
  onChange: (value: number) => void;
  options: AutocompleteOption[];
  onCreate?: (name: string) => Promise<number>;
  placeholder?: string;
  disabled?: boolean;
}

export function AutocompleteCombobox({
  value,
  onChange,
  options,
  onCreate,
  placeholder = "Select an option...",
  disabled = false,
}: AutocompleteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [open]);

  // Perform fuzzy search
  const results = useMemo(() => {
    if (!search.trim()) {
      return options.map(opt => ({ ...opt, score: 0 })).slice(0, 50); // Just show top 50
    }
    const fuzz_results = fuzzysort.go(search, options, { key: "name", all: true });
    return fuzz_results.map(res => {
      // fuzzysort score is negative, closer to 0 is better.
      // normalize it to 0-100% roughly for display.
      const rawScore = res.score;
      // score of 0 is perfect. -100 is ok. -1000 is bad.
      let matchPercent = 100;
      if (rawScore < 0) {
          matchPercent = Math.max(0, 100 + Math.floor(rawScore / 10)); // simple approximation
      }
      return {
        id: res.obj.id,
        name: res.obj.name,
        score: matchPercent,
      };
    }).slice(0, 50);
  }, [search, options]);

  const exactMatch = useMemo(() => {
    return options.some(opt => opt.name.toLowerCase() === search.trim().toLowerCase());
  }, [search, options]);

  const selectedOption = options.find((opt) => opt.id === value);

  const handleCreate = async () => {
    if (!onCreate || !search.trim()) return;
    setIsCreating(true);
    try {
      const newId = await onCreate(search.trim());
      onChange(newId);
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-white"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.name : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <input
              ref={inputRef}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {results.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  value === opt.id ? "bg-accent/50 text-accent-foreground" : ""
                )}
              >
                <Check className={cn("mr-2 h-4 w-4", value === opt.id ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 truncate">{opt.name}</span>
                {search.trim() && opt.score > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                    {opt.score}%
                  </span>
                )}
              </div>
            ))}
            
            {results.length === 0 && !search.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found.
              </div>
            )}

            {search.trim() && !exactMatch && onCreate && (
              <div
                onClick={isCreating ? undefined : handleCreate}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-primary/10 text-primary font-medium cursor-pointer mt-1 border-t border-t-primary/10"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create "{search}"
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
