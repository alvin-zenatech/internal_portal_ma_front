import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Building2, Check, ChevronDown, X, Plus, Loader2 } from "lucide-react";
import { useMasterClasses, useCreateMasterClass } from "@/hooks/useMasterTables";
import { cleanAndStandardizeText } from "@/utils/textStandardizer";

interface ClassAutocompleteProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
}

export function ClassAutocomplete({
  value = "",
  onChange,
  disabled = false,
  required = false,
  className = "",
  placeholder = "Search or enter class / department...",
  label,
}: ClassAutocompleteProps) {
  const { data: classesData, isLoading } = useMasterClasses();
  const createClass = useCreateMasterClass();

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const inputValue = value || "";

  const classItems = useMemo(() => {
    return (classesData?.items || [])
      .filter((item) => item.is_active)
      .map((item) => item.name);
  }, [classesData]);

  // Filter classes based on input
  const filteredClasses = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) return classItems;
    return classItems.filter((c) => c.toLowerCase().includes(q));
  }, [classItems, inputValue]);

  // Exact match check
  const isExactMatch = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) return false;
    return classItems.some((c) => c.toLowerCase() === q);
  }, [classItems, inputValue]);

  // Standardized candidate if typing new entry
  const standardizedCandidate = useMemo(() => {
    if (!inputValue.trim()) return "";
    return cleanAndStandardizeText(inputValue);
  }, [inputValue]);

  const canCreateNew = inputValue.trim().length > 0 && !isExactMatch;

  // Determine whether to open upward or downward
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[role='option']");
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (classNameVal: string) => {
    const cleaned = cleanAndStandardizeText(classNameVal);
    onChange(cleaned);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleCreateNew = async (rawName: string) => {
    const cleaned = cleanAndStandardizeText(rawName);
    if (!cleaned) return;
    onChange(cleaned);
    setIsOpen(false);
    setHighlightedIndex(-1);

    const alreadyExists = classItems.some(
      (c) => c.toLowerCase() === cleaned.toLowerCase()
    );
    if (!alreadyExists) {
      try {
        await createClass.mutateAsync({ name: cleaned });
      } catch {
        // Handled in mutation error toast
      }
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

    const totalOptions = filteredClasses.length + (canCreateNew ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredClasses.length) {
        handleSelect(filteredClasses[highlightedIndex]);
      } else if (canCreateNew && (highlightedIndex === filteredClasses.length || highlightedIndex === -1)) {
        handleCreateNew(standardizedCandidate || inputValue);
      } else if (filteredClasses.length > 0 && inputValue.trim()) {
        const exact = filteredClasses.find(
          (c) => c.toLowerCase() === inputValue.toLowerCase().trim()
        );
        if (exact) {
          handleSelect(exact);
        } else {
          handleCreateNew(standardizedCandidate || inputValue);
        }
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const renderHighlightedName = (name: string, query: string) => {
    if (!query.trim()) return name;
    const q = query.trim();
    const index = name.toLowerCase().indexOf(q.toLowerCase());
    if (index === -1) return name;
    return (
      <>
        {name.substring(0, index)}
        <span className="bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 font-bold px-0.5 rounded">
          {name.substring(index, index + q.length)}
        </span>
        {name.substring(index + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
          {inputValue && (
            <span className="text-[11px] text-muted-foreground font-normal">
              {isExactMatch ? "Master Class" : "New / Custom"}
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <Input
          value={inputValue}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full pr-14 text-xs font-medium h-9 sm:h-10"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setIsOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Clear class"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div
            ref={listRef}
            className={`absolute z-50 left-0 right-0 w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
            }`}
          >
            {/* Header info */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="h-3.5 w-3.5 text-sky-600" />
                Class / Department
              </span>
              <span className="text-[11px] font-mono">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  `${filteredClasses.length} records`
                )}
              </span>
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-zinc-800/50 py-1">
              {filteredClasses.map((cls, index) => {
                const isSelected =
                  cls.toLowerCase() === inputValue.toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={cls}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(cls);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between text-xs sm:text-sm transition-colors ${
                      isHighlighted
                        ? "bg-sky-50 dark:bg-sky-950/60 text-sky-950 dark:text-sky-100"
                        : isSelected
                        ? "bg-slate-50 dark:bg-zinc-800 font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-800 dark:text-zinc-200"
                    }`}
                  >
                    <span className="truncate">
                      {renderHighlightedName(cls, inputValue)}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-sky-600 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}

              {/* Option to create new record if no exact match */}
              {canCreateNew && (
                <div
                  role="option"
                  aria-selected={highlightedIndex === filteredClasses.length}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateNew(standardizedCandidate || inputValue);
                  }}
                  onMouseEnter={() => setHighlightedIndex(filteredClasses.length)}
                  className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 text-xs sm:text-sm border-t border-dashed border-sky-200 dark:border-sky-800/50 transition-colors ${
                    highlightedIndex === filteredClasses.length
                      ? "bg-sky-100 dark:bg-sky-900/40 text-sky-950 dark:text-sky-100 font-medium"
                      : "bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 hover:bg-sky-100/70"
                  }`}
                >
                  <Plus className="h-4 w-4 text-sky-600 shrink-0" />
                  <div className="flex flex-col truncate text-left">
                    <span className="font-semibold text-xs text-sky-900 dark:text-sky-200">
                      Create new class:
                    </span>
                    <span className="truncate font-medium text-slate-700 dark:text-zinc-200 text-xs">
                      &quot;{standardizedCandidate || inputValue}&quot;
                    </span>
                  </div>
                </div>
              )}

              {filteredClasses.length === 0 && !canCreateNew && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  <p>No classes available.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassAutocomplete;
