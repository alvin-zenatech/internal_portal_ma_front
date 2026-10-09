export interface PhoneItem {
  id: string;
  number: string;
  type: string;
  customType?: string;
}

export const PHONE_TYPES = [
  "Personal",
  "Office",
  "Cell",
  "Work",
  "Direct",
  "Main",
  "Fax",
  "Other",
] as const;

export type PhoneType = (typeof PHONE_TYPES)[number];

/**
 * Formats a single phone number cleanly (e.g. 123-456-7890 or with extension).
 */
export function formatSinglePhone(val: string | number | null | undefined): string {
  if (!val) return "";
  let s = String(val).trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "none" || s === "-" || s === "<na>") return "";

  if (s.endsWith(".0")) s = s.slice(0, -2);

  // Extract extension if present
  let ext = "";
  const extMatch = s.match(/[\s,.;]*(?:ext\.?|x|#)\s*(\d+)/i);
  if (extMatch) {
    ext = ` x${extMatch[1]}`;
    s = s.substring(0, extMatch.index).trim();
  }

  // Strip non-digits
  let digits = s.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}${ext}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}${ext}`;
  }
  if (digits.length > 10 && !ext) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)} x${digits.slice(10)}`;
  }

  // If digits are less than standard format, return cleaned string + ext
  return ext ? `${s}${ext}` : s;
}

/**
 * Cleanly formats phone input as the user types (strictly numeric + phone formatting).
 */
export function formatAsYouTypePhone(val: string): string {
  if (!val) return "";
  
  // Check for extension part (e.g. x123 or ext 123)
  let extPart = "";
  const extMatch = val.match(/[\s,.;]*(?:ext\.?|x|#)\s*(\d*)/i);
  let mainPart = val;
  if (extMatch && extMatch.index !== undefined) {
    extPart = extMatch[1] ? ` x${extMatch[1]}` : "";
    mainPart = val.substring(0, extMatch.index);
  }

  // Extract only digits from main part
  let digits = mainPart.replace(/\D/g, "");

  // Normalize 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  // Format as ###-###-#### as digits are entered
  let formatted = "";
  if (digits.length <= 3) {
    formatted = digits;
  } else if (digits.length <= 6) {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else if (digits.length <= 10) {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)} x${digits.slice(10)}`;
  }

  return `${formatted}${extPart}`;
}

/**
 * Parses any phone string (single, multi-phone with (Type) suffixes or Type: prefixes,
 * comma/semicolon/newline/pipe separated) into a structured array of PhoneItem.
 */
export function parsePhoneNumbers(raw: string | null | undefined): PhoneItem[] {
  if (!raw || typeof raw !== "string") return [];
  const s = raw.trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "none" || s === "-" || s === "<na>") return [];

  // Split by common separators: newline, semicolon, pipe, or comma when not inside parentheses
  // Regex matches commas, semicolons, pipes, or newlines
  const segments: string[] = [];
  
  // Custom splitter that avoids splitting inside parentheses
  let current = "";
  let parenDepth = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (char === "(") parenDepth++;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);

    if (parenDepth === 0 && (char === ";" || char === "\n" || char === "|" || char === "," || (char === "/" && (s[i+1] === " " || s[i-1] === " ")))) {
      if (current.trim()) segments.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) segments.push(current.trim());

  const items: PhoneItem[] = [];

  segments.forEach((seg, idx) => {
    let cleanSeg = seg.trim();
    if (!cleanSeg) return;

    let detectedType = "";
    let customType = "";

    // Check for prefix label, e.g. "Office: 555-123-4567" or "Cell - 555-123-4567"
    const prefixMatch = cleanSeg.match(/^([A-Za-z\s]+)[:\-]\s*(.*)$/);
    if (prefixMatch && prefixMatch[1] && prefixMatch[2]) {
      const prefixLabel = prefixMatch[1].trim();
      const numPart = prefixMatch[2].trim();
      if (numPart.replace(/\D/g, "").length >= 3) {
        detectedType = prefixLabel;
        cleanSeg = numPart;
      }
    }

    // Check for suffix label in parentheses, e.g. "555-123-4567 (Personal)" or "555-123-4567 (Office)"
    const suffixMatch = cleanSeg.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (suffixMatch && suffixMatch[1] && suffixMatch[2]) {
      // Check if suffix inside paren is a type or an area code
      const insideParen = suffixMatch[2].trim();
      // If inside paren is purely 3 digits and suffixMatch[1] is empty, it's an area code like (555) 123-4567
      if (!/^\d{3}$/.test(insideParen) || suffixMatch[1].trim().length > 0) {
        detectedType = insideParen;
        cleanSeg = suffixMatch[1].trim();
      }
    }

    // Format phone number
    const formattedNum = formatSinglePhone(cleanSeg) || cleanSeg;

    if (!formattedNum || formattedNum.replace(/\D/g, "").length === 0) {
      return;
    }

    // Determine normalized type
    let normalizedType: string = "Personal";
    if (detectedType) {
      const matchStandard = PHONE_TYPES.find(
        (t) => t.toLowerCase() === detectedType.toLowerCase()
      );
      if (matchStandard && matchStandard !== "Other") {
        normalizedType = matchStandard;
      } else {
        normalizedType = "Other";
        customType = detectedType;
      }
    } else {
      // Default type based on position: 1st is Personal, 2nd is Office, 3rd is Cell, etc.
      if (idx === 0) normalizedType = "Personal";
      else if (idx === 1) normalizedType = "Office";
      else if (idx === 2) normalizedType = "Cell";
      else normalizedType = "Work";
    }

    items.push({
      id: `phone-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      number: formattedNum,
      type: normalizedType,
      customType: customType || undefined,
    });
  });

  return items;
}

/**
 * Serializes an array of PhoneItems into a standardized string for backend storage.
 * Format: "555-123-4567 (Personal), 555-987-6543 (Office)"
 */
export function serializePhoneNumbers(items: (PhoneItem | { number?: string; type?: string; customType?: string })[]): string {
  if (!items || !items.length) return "";

  const validItems = items
    .map((item) => {
      const rawNum = item.number?.trim() || "";
      if (!rawNum) return null;
      const formatted = formatSinglePhone(rawNum) || rawNum;
      if (!formatted || formatted.replace(/\D/g, "").length === 0) return null;

      const effectiveType = item.type === "Other" && item.customType?.trim() 
        ? item.customType.trim() 
        : item.type?.trim();

      if (effectiveType) {
        return `${formatted} (${effectiveType})`;
      }
      return formatted;
    })
    .filter((s): s is string => Boolean(s));

  return validItems.join(", ");
}

/**
 * Returns badge styling classes for a specific phone type tag.
 */
export function getPhoneTypeBadgeStyle(type?: string): {
  badge: string;
  dot: string;
} {
  const norm = (type || "").toLowerCase().trim();
  switch (norm) {
    case "personal":
      return {
        badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        dot: "bg-blue-500",
      };
    case "office":
      return {
        badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
        dot: "bg-purple-500",
      };
    case "cell":
    case "mobile":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
      };
    case "work":
      return {
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
        dot: "bg-cyan-500",
      };
    case "direct":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
      };
    case "main":
      return {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
        dot: "bg-indigo-500",
      };
    case "fax":
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        dot: "bg-slate-500",
      };
    default:
      return {
        badge: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
        dot: "bg-zinc-500",
      };
  }
}

/**
 * Returns the first / primary formatted phone number from a raw phone string.
 */
export function getPrimaryPhoneNumber(raw: string | null | undefined): string {
  const items = parsePhoneNumbers(raw);
  return items.length > 0 ? items[0].number : "";
}
