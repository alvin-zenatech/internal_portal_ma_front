import React, { useState } from "react";
import { Phone, Copy, Check } from "lucide-react";
import { parsePhoneNumbers, getPhoneTypeBadgeStyle } from "@/lib/phoneUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PhoneDisplayProps {
  phone?: string | null;
  className?: string;
  mode?: "badges" | "list" | "inline" | "compact";
  emptyText?: string;
  showIcon?: boolean;
  clickable?: boolean;
}

export function PhoneDisplay({
  phone,
  className,
  mode = "badges",
  emptyText = "-",
  showIcon = true,
  clickable = true,
}: PhoneDisplayProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const items = React.useMemo(() => parsePhoneNumbers(phone), [phone]);

  if (!items || items.length === 0) {
    if (!emptyText) return null;
    return <span className={cn("text-muted-foreground text-xs", className)}>{emptyText}</span>;
  }

  const handleCopy = (e: React.MouseEvent, num: string, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(num.replace(/\s*x\d+.*$/i, ""));
    setCopiedId(id);
    toast.success(`Copied ${num} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. List Mode (Ideal for Task Details panel and full profiles)
  if (mode === "list") {
    return (
      <div className={cn("space-y-1.5 w-full", className)}>
        {items.map((item, idx) => {
          const typeLabel = item.type === "Other" && item.customType ? item.customType : item.type;
          const typeStyle = getPhoneTypeBadgeStyle(typeLabel);
          const isCopied = copiedId === item.id;
          const cleanTelDigits = item.number.replace(/\D/g, "");

          return (
            <div
              key={item.id || idx}
              className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-md border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {showIcon && <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <a
                  href={clickable ? `tel:${cleanTelDigits}` : undefined}
                  onClick={(e) => !clickable && e.preventDefault()}
                  className={cn(
                    "font-medium text-xs sm:text-sm font-mono tracking-tight truncate",
                    clickable ? "hover:underline text-foreground" : "text-foreground"
                  )}
                  title={`Call ${item.number}`}
                >
                  {item.number}
                </a>
                {typeLabel && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.2 rounded border font-sans tracking-wide shrink-0",
                      typeStyle.badge
                    )}
                  >
                    {typeLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, item.number, item.id)}
                  title="Copy phone number"
                  className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 2. Badges / Inline Mode (Ideal for Table rows, header info, cards)
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item, idx) => {
        const typeLabel = item.type === "Other" && item.customType ? item.customType : item.type;
        const typeStyle = getPhoneTypeBadgeStyle(typeLabel);
        const isCopied = copiedId === item.id;
        const cleanTelDigits = item.number.replace(/\D/g, "");

        return (
          <div
            key={item.id || idx}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs py-0.5 px-2 rounded-md border font-mono transition-all group/badge",
              typeStyle.badge
            )}
          >
            {showIcon && idx === 0 && <Phone className="h-3 w-3 shrink-0 opacity-70" />}
            <a
              href={clickable ? `tel:${cleanTelDigits}` : undefined}
              onClick={(e) => e.stopPropagation()}
              className={cn("truncate", clickable && "hover:underline")}
              title={`Call ${item.number}`}
            >
              {item.number}
            </a>
            {typeLabel && (
              <span className="text-[10px] font-sans font-semibold opacity-85 px-1 py-0.1 rounded bg-black/5 dark:bg-white/10 shrink-0">
                {typeLabel}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => handleCopy(e, item.number, item.id)}
              className="opacity-0 group-hover/badge:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded transition-opacity"
              title="Copy number"
            >
              {isCopied ? (
                <Check className="h-2.5 w-2.5 text-emerald-600" />
              ) : (
                <Copy className="h-2.5 w-2.5 text-current" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default PhoneDisplay;
