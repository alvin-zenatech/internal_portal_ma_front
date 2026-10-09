import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Phone } from "lucide-react";
import { 
  type PhoneItem, 
  PHONE_TYPES, 
  parsePhoneNumbers, 
  serializePhoneNumbers, 
  formatSinglePhone,
  formatAsYouTypePhone,
  getPhoneTypeBadgeStyle 
} from "@/lib/phoneUtils";
import { cn } from "@/lib/utils";

interface MultiPhoneInputProps {
  value?: string | null;
  onChange: (serializedValue: string) => void;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function MultiPhoneInput({
  value,
  onChange,
  required = false,
  className,
  disabled = false,
}: MultiPhoneInputProps) {
  const [items, setItems] = useState<PhoneItem[]>(() => {
    const parsed = parsePhoneNumbers(value);
    if (parsed.length > 0) return parsed;
    return [{ id: "phone-1", number: "", type: "Personal" }];
  });

  const lastSerializedRef = useRef<string>("");

  // Sync with external value changes (e.g. form reset, company autofill, task edit load)
  useEffect(() => {
    const currentSerialized = serializePhoneNumbers(items);
    const incomingVal = (value || "").trim();
    if (incomingVal !== currentSerialized && incomingVal !== lastSerializedRef.current) {
      lastSerializedRef.current = incomingVal;
      const parsed = parsePhoneNumbers(incomingVal);
      if (parsed.length > 0) {
        setItems(parsed);
      } else {
        setItems([{ id: `phone-${Date.now()}`, number: "", type: "Personal" }]);
      }
    }
  }, [value]);

  const notifyChange = (newItems: PhoneItem[]) => {
    setItems(newItems);
    const serialized = serializePhoneNumbers(newItems);
    lastSerializedRef.current = serialized;
    onChange(serialized);
  };

  const handleNumberChange = (id: string, rawVal: string) => {
    // Only allow digits, spaces, hyphens, parentheses, plus, and extension notation
    const filtered = rawVal.replace(/[^0-9+\-()\s.,#xext]/gi, "");
    
    // Auto-format as digits are typed
    const formatted = formatAsYouTypePhone(filtered);

    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, number: formatted };
      }
      return item;
    });
    notifyChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys, backspace, delete, tab, enter, arrows, copy/paste shortcuts
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Allow numeric digits and standard phone characters (+, -, (, ), x, #, space, .)
    if (!/^[0-9+\-()\s.,#x]$/i.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNumberBlur = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id && item.number.trim()) {
        const formatted = formatSinglePhone(item.number);
        return { ...item, number: formatted || item.number };
      }
      return item;
    });
    notifyChange(updated);
  };

  const handleTypeChange = (id: string, newType: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          type: newType,
          customType: newType === "Other" ? (item.customType || "") : undefined,
        };
      }
      return item;
    });
    notifyChange(updated);
  };

  const handleCustomTypeChange = (id: string, customVal: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, customType: customVal };
      }
      return item;
    });
    notifyChange(updated);
  };

  const handleAddRow = () => {
    // Pick next suitable default type based on count
    let nextType = "Office";
    if (items.some((i) => i.type === "Office")) {
      nextType = "Cell";
    }
    if (items.some((i) => i.type === "Cell")) {
      nextType = "Work";
    }

    const newItem: PhoneItem = {
      id: `phone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      number: "",
      type: nextType,
    };
    notifyChange([...items, newItem]);
  };

  const handleRemoveRow = (id: string) => {
    if (items.length <= 1) {
      // Don't completely remove the last row, just clear it
      notifyChange([{ id: `phone-${Date.now()}`, number: "", type: "Personal" }]);
      return;
    }
    const updated = items.filter((item) => item.id !== id);
    notifyChange(updated);
  };

  // Smart paste support: when pasting multiple numbers into one field
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, id: string) => {
    const text = e.clipboardData.getData("text");
    if (text && (text.includes(",") || text.includes("\n") || text.includes(";") || (text.includes("(") && text.includes(")")))) {
      const parsed = parsePhoneNumbers(text);
      if (parsed.length > 1) {
        e.preventDefault();
        // Replace or merge into current items
        const currentIdx = items.findIndex((i) => i.id === id);
        const newItems = [...items];
        newItems.splice(currentIdx, 1, ...parsed);
        notifyChange(newItems);
      }
    }
  };

  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="space-y-2">
        {items.map((item, index) => {
          const typeStyle = getPhoneTypeBadgeStyle(item.type === "Other" && item.customType ? item.customType : item.type);

          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-md border border-border/70 bg-muted/20 transition-all hover:border-border hover:bg-muted/30"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={item.number}
                    onChange={(e) => handleNumberChange(item.id, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => handleNumberBlur(item.id)}
                    onPaste={(e) => handlePaste(e, item.id)}
                    placeholder={index === 0 ? "e.g. 555-123-4567" : "Additional phone..."}
                    required={required && index === 0 && !items.some(i => i.number.trim())}
                    disabled={disabled}
                    className="pl-8 h-8.5 sm:h-9 text-xs sm:text-sm bg-background font-mono"
                  />
                </div>

                <Select
                  value={item.type}
                  onValueChange={(val) => handleTypeChange(item.id, val)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[105px] sm:w-[115px] shrink-0 h-8.5 sm:h-9 text-xs sm:text-sm bg-background">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", typeStyle.dot)} />
                      <SelectValue placeholder="Type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs sm:text-sm">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {item.type === "Other" && (
                <Input
                  type="text"
                  value={item.customType || ""}
                  onChange={(e) => handleCustomTypeChange(item.id, e.target.value)}
                  placeholder="Custom label (e.g. Reception)"
                  disabled={disabled}
                  className="sm:w-[130px] shrink-0 h-8.5 sm:h-9 text-xs sm:text-sm bg-background"
                />
              )}

              <div className="flex items-center justify-end gap-1 shrink-0">
                {(items.length > 1 || item.number.trim().length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(item.id)}
                    disabled={disabled}
                    title="Remove phone number"
                    className="h-8.5 w-8.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={disabled}
          className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground border-dashed border-border hover:border-primary/50 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Another Phone Number</span>
        </Button>
        {items.length > 1 && (
          <span className="text-[11px] text-muted-foreground">
            {items.filter((i) => i.number.trim()).length} phone number{items.filter((i) => i.number.trim()).length === 1 ? "" : "s"} added
          </span>
        )}
      </div>
    </div>
  );
}

export default MultiPhoneInput;
