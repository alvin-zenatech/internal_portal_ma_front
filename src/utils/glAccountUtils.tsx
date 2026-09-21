import React from "react";
import type { GLCodeOption } from "@/types/chartOfAccount";
import { Badge } from "@/components/ui/badge";
import { Landmark, CreditCard, ArrowRightLeft } from "lucide-react";

export interface ParsedGLAccount {
  account_number: string;
  account_name: string;
  account_type?: string;
  is_bank_account: boolean;
  is_credit_card: boolean;
  bank_name?: string | null;
  bank_account_last4?: string | null;
  subsidiary?: string | null;
  display_label: string;
}

const CARD_OR_BANK_REGEX = /^(.*?)[-\s]+(\d{4,5})\s*(?:\((.*?)\))?$/;

/**
 * Parses any GL Code or raw label string into its constituent parts:
 * GL Code (e.g. "1042"), Bank Name ("BOA"), Bank Account Last 4 ("9572"), and Subsidiary ("InterlinkOne").
 */
export function parseGLAccount(
  rawVal: string | null | undefined,
  glCodesList: GLCodeOption[] = []
): ParsedGLAccount | null {
  if (!rawVal) return null;
  const trimmed = String(rawVal).trim();
  if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed === "null" || trimmed === "None" || trimmed === "undefined") return null;

  // 1. Try finding exact/prefix match in preloaded glCodesList
  const found = glCodesList.find(
    (c) =>
      c.account_number === trimmed ||
      c.display_label === trimmed ||
      trimmed.startsWith(c.account_number + " - ") ||
      trimmed.startsWith(c.account_number + " ") ||
      c.account_name.toLowerCase() === trimmed.toLowerCase() ||
      (c.bank_account_last4 && c.bank_account_last4 === trimmed) ||
      (c.account_name && CARD_OR_BANK_REGEX.exec(c.account_name)?.[2] === trimmed)
  );

  let number = found ? found.account_number : trimmed;
  let name = found ? found.account_name : "";
  let type = found?.account_type || "";
  let bankName = found?.bank_name ?? null;
  let last4 = found?.bank_account_last4 ?? null;
  let subsidiary = found?.subsidiary ?? null;
  let isBank = found?.is_bank_account ?? false;
  let isCC = found?.is_credit_card ?? false;

  // 2. If not matched directly in glCodesList, parse raw string e.g. "1042 - BOA - 9572 (InterlinkOne)" or "Bank of America - 7458 - Pace Plus"
  if (!found) {
    if (trimmed.includes(" - ")) {
      const parts = trimmed.split(" - ");
      if (parts.length >= 3 && /^\d{4,5}$/.test(parts[1].trim())) {
        // e.g. "Bank of America - 7458 - Pace Plus"
        bankName = expandBankName(parts[0].trim());
        last4 = parts[1].trim();
        subsidiary = parts.slice(2).join(" - ").trim();
        number = last4;
        name = `${bankName} - ${last4} (${subsidiary})`;
        isBank = true;
      } else if (parts.length === 2 && /^\d{4,5}$/.test(parts[1].trim())) {
        // e.g. "Bank of America - 7458"
        bankName = expandBankName(parts[0].trim());
        last4 = parts[1].trim();
        number = last4;
        name = `${bankName} - ${last4}`;
        isBank = true;
      } else {
        number = parts[0].trim();
        name = parts.slice(1).join(" - ").trim();
      }
    } else if (trimmed.includes(" ")) {
      const firstSpace = trimmed.indexOf(" ");
      number = trimmed.substring(0, firstSpace).trim();
      name = trimmed.substring(firstSpace + 1).trim();
    }
  }

  // 3. Extract bank name, last 4, and subsidiary from name if available
  const isCandidateBank = number.startsWith("10") || type.toLowerCase() === "bank" || isBank || Boolean(bankName);
  const isCandidateCC = number.startsWith("201") || type.toLowerCase() === "credit card" || isCC || trimmed.toLowerCase().includes("credit card") || trimmed.toLowerCase().includes("amex");

  if (isCandidateBank) {
    isBank = true;
    if (!bankName && name) {
      const match = CARD_OR_BANK_REGEX.exec(name);
      if (match) {
        bankName = match[1].replace(/^[-\s]+|[-\s]+$/g, "");
        last4 = match[2];
        subsidiary = match[3] || null;
      } else {
        bankName = name;
      }
    }
  } else if (isCandidateCC) {
    isCC = true;
    if (!bankName && name) {
      const match = CARD_OR_BANK_REGEX.exec(name);
      if (match) {
        bankName = match[1].replace(/^[-\s]+|[-\s]+$/g, "");
        last4 = match[2];
        subsidiary = match[3] || null;
      } else {
        bankName = name;
      }
    }
  }

  // If still no last4, check if name matches CARD_OR_BANK_REGEX
  if (!last4 && name) {
    const match = CARD_OR_BANK_REGEX.exec(name);
    if (match) {
      bankName = bankName || match[1].replace(/^[-\s]+|[-\s]+$/g, "");
      last4 = match[2];
      subsidiary = subsidiary || match[3] || null;
      isBank = true;
    }
  }

  const display_label = found?.display_label || (name ? `${number} - ${name}` : number);

  return {
    account_number: number,
    account_name: name,
    account_type: type,
    is_bank_account: isBank,
    is_credit_card: isCC,
    bank_name: bankName,
    bank_account_last4: last4,
    subsidiary: subsidiary,
    display_label,
  };
}

/**
 * Returns a human-friendly formatted string. For 10xx bank accounts, cleanly separates Code, Bank, and Last 4.
 */
export function formatGLCode(
  code: string | null | undefined,
  glCodesList: GLCodeOption[] = []
): string {
  const parsed = parseGLAccount(code, glCodesList);
  if (!parsed) return "—";
  if ((parsed.is_bank_account || parsed.is_credit_card) && (parsed.bank_name || parsed.bank_account_last4)) {
    const parts = [parsed.account_number];
    if (parsed.bank_name) parts.push(parsed.bank_name);
    if (parsed.bank_account_last4) parts.push(`•••• ${parsed.bank_account_last4}`);
    if (parsed.subsidiary) parts.push(`(${parsed.subsidiary})`);
    return parts.join(" • ");
  }
  return parsed.account_name ? `${parsed.account_number} - ${parsed.account_name}` : parsed.account_number;
}

/**
 * Renders structured visual badges for GL accounts, separating GL Code, Bank Name, Account Last 4, and Subsidiary.
 */
export function renderGLAccountBadge(
  code: string | null | undefined,
  glCodesList: GLCodeOption[] = []
): React.ReactNode {
  const parsed = parseGLAccount(code, glCodesList);
  if (!parsed) {
    return <span className="text-slate-400 italic text-xs">Unassigned</span>;
  }

  if ((parsed.is_bank_account || parsed.is_credit_card) && (parsed.bank_name || parsed.bank_account_last4)) {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 shrink-0 shadow-2xs">
          GL {parsed.account_number}
        </span>
        {parsed.bank_name && (
          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
            {parsed.is_credit_card ? (
              <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            ) : (
              <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span>{parsed.bank_name}</span>
          </span>
        )}
        {parsed.bank_account_last4 && (
          <span className="font-mono font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded text-[11px]">
            •••• {parsed.bank_account_last4}
          </span>
        )}
        {parsed.subsidiary && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50">
            {parsed.subsidiary}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 shrink-0">
        {parsed.account_number}
      </span>
      {parsed.account_name ? (
        <span className="font-medium text-slate-800 dark:text-zinc-200 break-words">
          {parsed.account_name}
        </span>
      ) : null}
      {parsed.account_type && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-slate-500">
          {parsed.account_type}
        </Badge>
      )}
    </div>
  );
}

export interface PaymentMethodOption {
  value: string;
  account_number?: string;
  bank_name: string;
  last4?: string | null;
  subsidiary?: string | null;
  card_type: "Credit Card" | "Debit Card" | "Wire" | "Other";
  display_label: string;
}

/**
 * Builds the full list of selectable payment methods based on active GL Accounts (Credit Cards, Debit Cards) + Wire Transfer.
 * Format for cards: "<Bank Name> - <4 Digit> (<Subsidiary>) (Credit Card)" / "(Debit Card)"
 */
export function buildPaymentMethodOptions(glCodes: GLCodeOption[] = []): PaymentMethodOption[] {
  const options: PaymentMethodOption[] = [];
  const seenValues = new Set<string>();

  // 1. Credit Cards from Chart of Accounts (20xx or account_type == "Credit Card")
  const ccAccounts = glCodes.filter(
    (c) =>
      c.is_credit_card ||
      c.account_type?.toLowerCase() === "credit card" ||
      c.account_number?.startsWith("201")
  );

  for (const acc of ccAccounts) {
    const parsed = parseGLAccount(acc.display_label || `${acc.account_number} - ${acc.account_name}`, glCodes);
    const bankName = parsed?.bank_name || acc.account_name;
    const last4 = parsed?.bank_account_last4 || "";
    const sub = parsed?.subsidiary ? ` (${parsed.subsidiary})` : "";
    const cardStr = last4 ? `${bankName} - ${last4}${sub} (Credit Card)` : `${bankName}${sub} (Credit Card)`;

    if (!seenValues.has(cardStr)) {
      seenValues.add(cardStr);
      options.push({
        value: cardStr,
        account_number: acc.account_number,
        bank_name: bankName,
        last4: last4 || null,
        subsidiary: parsed?.subsidiary || null,
        card_type: "Credit Card",
        display_label: cardStr,
      });
    }
  }

  // Fallback default Credit Cards if none in GL
  if (ccAccounts.length === 0) {
    const defaultCCs = [
      { bank: "Amex", last4: "77002", sub: "InterlinkOne" },
      { bank: "US Bank", last4: "0292", sub: "Interactive" },
      { bank: "Capital One", last4: "4511", sub: "PsPortals" },
      { bank: "BOA CC", last4: "9452", sub: "InterlinkOne" },
    ];
    for (const d of defaultCCs) {
      const val = `${d.bank} - ${d.last4} (${d.sub}) (Credit Card)`;
      if (!seenValues.has(val)) {
        seenValues.add(val);
        options.push({
          value: val,
          bank_name: d.bank,
          last4: d.last4,
          subsidiary: d.sub,
          card_type: "Credit Card",
          display_label: val,
        });
      }
    }
  }

  // 2. Debit Cards / Bank Accounts from Chart of Accounts (10xx or account_type == "Bank")
  const bankAccounts = glCodes.filter(
    (c) =>
      c.is_bank_account ||
      c.account_type?.toLowerCase() === "bank" ||
      c.account_number?.startsWith("10")
  );

  for (const acc of bankAccounts) {
    const parsed = parseGLAccount(acc.display_label || `${acc.account_number} - ${acc.account_name}`, glCodes);
    const bankName = parsed?.bank_name || acc.account_name;
    const last4 = parsed?.bank_account_last4 || "";
    const sub = parsed?.subsidiary ? ` (${parsed.subsidiary})` : "";
    const cardStr = last4 ? `${bankName} - ${last4}${sub} (Debit Card)` : `${bankName}${sub} (Debit Card)`;

    if (!seenValues.has(cardStr)) {
      seenValues.add(cardStr);
      options.push({
        value: cardStr,
        account_number: acc.account_number,
        bank_name: bankName,
        last4: last4 || null,
        subsidiary: parsed?.subsidiary || null,
        card_type: "Debit Card",
        display_label: cardStr,
      });
    }
  }

  // 3. Wire Transfer option
  options.push({
    value: "Wire Transfer",
    bank_name: "Wire Transfer",
    last4: null,
    subsidiary: null,
    card_type: "Wire",
    display_label: "Wire Transfer",
  });

  return options;
}

/**
 * Parses a payment method string to extract bank name, last 4, subsidiary, and card type.
 */
export function parsePaymentMethod(val: string | null | undefined): {
  bank_name: string;
  last4?: string | null;
  subsidiary?: string | null;
  card_type: "Credit Card" | "Debit Card" | "Wire" | "Other";
  raw: string;
} | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed === "null" || trimmed === "None" || trimmed === "undefined") return null;

  if (trimmed === "CC" || trimmed.toLowerCase() === "credit card") {
    return { bank_name: "Credit Card", card_type: "Credit Card", raw: trimmed };
  }
  if (trimmed === "DC" || trimmed.toLowerCase() === "debit card") {
    return { bank_name: "Debit Card", card_type: "Debit Card", raw: trimmed };
  }
  if (trimmed === "W" || trimmed.toLowerCase() === "wire" || trimmed.toLowerCase() === "wire transfer") {
    return { bank_name: "Wire Transfer", card_type: "Wire", raw: trimmed };
  }

  const isCC = trimmed.includes("(Credit Card)") || trimmed.toLowerCase().includes("credit") || trimmed.startsWith("201");
  const isDC = trimmed.includes("(Debit Card)") || trimmed.toLowerCase().includes("debit") || trimmed.startsWith("10");
  const isWire = trimmed.toLowerCase().includes("wire");

  // Clean suffix (Credit Card) or (Debit Card)
  let clean = trimmed.replace(/\s*\((?:Credit Card|Debit Card)\)\s*$/i, "").trim();

  let subsidiary: string | null = null;
  const subMatch = /\(([^)]+)\)/.exec(clean);
  if (subMatch) {
    subsidiary = subMatch[1].trim();
    clean = clean.replace(/\([^)]+\)/, "").trim();
  }

  let last4: string | null = null;
  const digitMatch = /(\d{4,5})/.exec(clean);
  if (digitMatch) {
    last4 = digitMatch[1];
    clean = clean.replace(/\d{4,5}/, "").replace(/^[-\s]+|[-\s]+$/g, "").trim();
  }

  let bankName = "";
  if (clean) {
    bankName = expandBankName(clean);
  } else {
    bankName = isCC ? "Credit Card" : isDC ? "Debit Card" : isWire ? "Wire Transfer" : "Card";
  }

  return {
    bank_name: bankName,
    last4: last4,
    subsidiary: subsidiary,
    card_type: isCC ? "Credit Card" : isDC ? "Debit Card" : isWire ? "Wire" : "Other",
    raw: trimmed,
  };
}

/**
 * Renders a rich, colored badge for a selected payment method.
 */
export function renderPaymentMethodBadge(val: string | null | undefined): React.ReactNode {
  const parsed = parsePaymentMethod(val);
  if (!parsed) {
    return <span className="text-slate-400 italic text-xs">Unspecified</span>;
  }

  if (parsed.card_type === "Wire") {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1 rounded-md shadow-2xs">
        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Wire Transfer</span>
      </span>
    );
  }

  if (parsed.card_type === "Credit Card") {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md shadow-2xs">
          <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>{parsed.bank_name}</span>
        </span>
        {parsed.last4 && (
          <span className="font-mono font-medium text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded text-[11px]">
            •••• {parsed.last4}
          </span>
        )}
        {parsed.subsidiary && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-medium">
            {parsed.subsidiary}
          </span>
        )}
        {parsed.bank_name !== "Credit Card" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900">
            Credit Card
          </Badge>
        )}
      </div>
    );
  }

  if (parsed.card_type === "Debit Card") {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md shadow-2xs">
          <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{parsed.bank_name}</span>
        </span>
        {parsed.last4 && (
          <span className="font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded text-[11px]">
            •••• {parsed.last4}
          </span>
        )}
        {parsed.subsidiary && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-medium">
            {parsed.subsidiary}
          </span>
        )}
        {parsed.bank_name !== "Debit Card" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900">
            Debit Card
          </Badge>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-medium text-xs text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
      {val}
    </span>
  );
}

/**
 * Maps a payment method / payment format string into its corresponding bank account string as default.
 * Finds any matching bank account from the chart of accounts, or formats the bank name, last 4, and entity.
 */
export function mapPaymentMethodToBankAccount(
  val: string | null | undefined,
  glCodesList: GLCodeOption[] = []
): string | null {
  if (!val) return null;
  const parsedPm = parsePaymentMethod(val);
  if (!parsedPm) return null;

  // If generic without bank or last4, cannot map
  if (!parsedPm.last4 && (!parsedPm.bank_name || parsedPm.bank_name === "Credit Card" || parsedPm.bank_name === "Debit Card" || parsedPm.bank_name === "Wire Transfer" || parsedPm.bank_name === "Card")) {
    return null;
  }

  // 1. Try finding exact matching bank account in glCodesList by last4
  if (parsedPm.last4) {
    const l4 = parsedPm.last4;
    const glMatch = glCodesList.find(
      c => (c.is_bank_account || c.is_credit_card || c.account_type === "Bank" || c.account_type === "Credit Card") &&
           (c.bank_account_last4 === l4 || Boolean(c.account_name?.includes(l4)) || Boolean(c.display_label?.includes(l4)) || c.account_number === l4)
    );
    if (glMatch) {
      return glMatch.display_label || `${glMatch.account_number} - ${glMatch.account_name}`;
    }
  }

  // 2. Build structured string: Bank Name - Last4 - Subsidiary
  const parts: string[] = [];
  if (parsedPm.bank_name && parsedPm.bank_name !== "Credit Card" && parsedPm.bank_name !== "Debit Card" && parsedPm.bank_name !== "Wire Transfer" && parsedPm.bank_name !== "Card") {
    parts.push(expandBankName(parsedPm.bank_name));
  } else if (parsedPm.subsidiary) {
    parts.push(parsedPm.subsidiary);
  }

  if (parsedPm.last4) {
    parts.push(parsedPm.last4);
  }

  if (parsedPm.subsidiary && !parts.includes(parsedPm.subsidiary)) {
    parts.push(parsedPm.subsidiary);
  }

  return parts.length > 0 ? parts.join(" - ") : null;
}

/**
 * Checks if a GL account option is a Bank or Credit Card account.
 */
export function isBankAccountOption(
  account: GLCodeOption | ParsedGLAccount | null | undefined
): boolean {
  if (!account) return false;
  const accType = (account.account_type || "").toLowerCase();
  const accNum = account.account_number || "";
  return (
    account.is_bank_account === true ||
    account.is_credit_card === true ||
    accType === "bank" ||
    accType === "credit card" ||
    accNum.startsWith("10") ||
    accNum.startsWith("201")
  );
}

const BANK_NAME_MAP: Record<string, string> = {
  boa: "Bank of America",
  "boa cc": "Bank of America Credit Card",
  amex: "American Express",
  "capital one": "Capital One",
  "us bank": "US Bank",
  chase: "JPMorgan Chase Bank",
  td: "TD Bank",
  bmo: "Bank of Montreal (BMO)",
  citi: "Citibank",
  rbc: "Royal Bank of Canada (RBC)",
  scotia: "Scotiabank",
  cibc: "CIBC",
  svb: "Silicon Valley Bank",
};

/**
 * Expands short bank abbreviations into full bank names.
 */
export function expandBankName(shortName: string | null | undefined): string {
  if (!shortName) return "";
  const key = shortName.trim().toLowerCase();
  return BANK_NAME_MAP[key] || shortName.trim();
}

/**
 * Formats a bank account option for display with full bank name:
 * "Bank Name - Account Last 4 - Entity"
 */
export function formatBankAccountDisplay(
  rawVal: string | GLCodeOption | ParsedGLAccount | null | undefined,
  glCodesList: GLCodeOption[] = []
): string {
  if (!rawVal) return "";
  let parsed: ParsedGLAccount | null = null;

  if (typeof rawVal === "object") {
    if ("is_bank_account" in rawVal && (rawVal as ParsedGLAccount).bank_name && (rawVal as ParsedGLAccount).bank_account_last4) {
      parsed = rawVal as ParsedGLAccount;
    } else {
      const searchStr = (rawVal as any).display_label || `${(rawVal as any).account_number || ""} - ${(rawVal as any).account_name || ""}`;
      parsed = parseGLAccount(searchStr, glCodesList) || parseGLAccount((rawVal as any).account_name, glCodesList);
    }
  } else {
    parsed = parseGLAccount(rawVal, glCodesList);
  }

  if (parsed && (parsed.bank_name || parsed.bank_account_last4)) {
    const fullBank = expandBankName(parsed.bank_name || parsed.account_name);
    const parts: string[] = [];
    if (fullBank) parts.push(fullBank);
    if (parsed.bank_account_last4) parts.push(parsed.bank_account_last4);
    if (parsed.subsidiary) parts.push(parsed.subsidiary);
    return parts.length > 0 ? parts.join(" - ") : String(rawVal);
  }

  return typeof rawVal === "string" ? rawVal : (rawVal as any)?.account_name || (rawVal as any)?.display_label || "";
}

/**
 * Formats category option for display with code at the front:
 * "[Code] Category Name" (or "Code - Category Name")
 */
export function formatCategoryDisplay(
  rawVal: string | GLCodeOption | ParsedGLAccount | null | undefined,
  glCodesList: GLCodeOption[] = []
): string {
  if (!rawVal) return "";
  if (typeof rawVal === "object") {
    const code = rawVal.account_number;
    const name = rawVal.account_name;
    return code && name ? `${code} - ${name}` : (name || code || "");
  }
  const parsed = parseGLAccount(rawVal, glCodesList);
  if (parsed) {
    const code = parsed.account_number;
    const name = parsed.account_name;
    return code && name ? `${code} - ${name}` : (name || code || String(rawVal));
  }
  return String(rawVal);
}

/**
 * Renders structured visual badges specifically for a Bank Account.
 * Format: [Icon] Full Bank Name + •••• Last 4 + (Entity / Subsidiary)
 */
export function renderBankAccountBadge(
  rawVal: string | null | undefined,
  glCodesList: GLCodeOption[] = []
): React.ReactNode {
  if (!rawVal || rawVal === "—" || rawVal === "-" || rawVal === "null" || rawVal === "None" || rawVal === "undefined" || !String(rawVal).trim()) {
    return <span className="text-slate-400 italic text-xs">—</span>;
  }

  const str = String(rawVal).trim();
  const GENERIC_PAYMENT_TYPES = ["dc", "cc", "wire", "check", "card", "debit card", "credit card", "other", "n/a"];
  if (
    GENERIC_PAYMENT_TYPES.includes(str.toLowerCase()) ||
    str.toLowerCase().includes("(credit card)") ||
    str.toLowerCase().includes("(debit card)")
  ) {
    return <span className="text-slate-400 italic text-xs">—</span>;
  }

  let bankName = "";
  let last4: string | null = null;
  let sub: string | null = null;
  let isCC = false;

  // Try matching against GL accounts first
  const parsed = parseGLAccount(str, glCodesList);
  if (parsed && (parsed.is_bank_account || parsed.is_credit_card || parsed.bank_name || parsed.bank_account_last4)) {
    bankName = expandBankName(parsed.bank_name || parsed.account_name);
    last4 = parsed.bank_account_last4 ?? null;
    sub = parsed.subsidiary ?? null;
    isCC = parsed.is_credit_card;
  } else {
    // If string is "Bank Name - Last4 - Entity" or "Bank Name - Last4"
    if (str.toLowerCase().includes("credit card") || str.toLowerCase().includes("amex") || str.toLowerCase().includes(" cc")) {
      isCC = true;
    }
    const cleanStr = str.replace(/\s*\((?:Credit|Debit)\s+Card\)/i, "");
    if (cleanStr.includes(" - ")) {
      const parts = cleanStr.split(" - ");
      bankName = expandBankName(parts[0].trim());
      if (parts.length >= 2) {
        last4 = parts[1].trim();
      }
      if (parts.length >= 3) {
        sub = parts.slice(2).join(" - ").trim();
      }
    } else {
      bankName = expandBankName(cleanStr);
    }
  }

  if (!bankName && !last4) {
    return <span className="text-slate-400 italic text-xs">—</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
        {isCC ? (
          <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
        ) : (
          <Landmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        )}
        <span>{bankName}</span>
      </span>
      {last4 && (
        <span className="font-mono font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded text-[11px]">
          •••• {last4}
        </span>
      )}
      {sub && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50">
          {sub}
        </Badge>
      )}
    </div>
  );
}

/**
 * Renders structured visual badge specifically for Category (code at the front).
 * Format: [Code] Category Name
 */
export function renderCategoryBadge(
  code: string | null | undefined,
  glCodesList: GLCodeOption[] = []
): React.ReactNode {
  if (!code || code === "—" || code === "-" || code === "null" || code === "None" || code === "undefined" || !String(code).trim()) {
    return <span className="text-slate-400 italic text-xs">—</span>;
  }

  const parsed = parseGLAccount(code, glCodesList);
  if (!parsed || (!parsed.account_number && !parsed.account_name)) {
    return <span className="text-slate-700 dark:text-zinc-300 text-xs">{code}</span>;
  }

  // If this is a bank account, it is not a category!
  if (isBankAccountOption(parsed)) {
    return <span className="text-slate-400 italic text-xs">—</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 shrink-0">
        {parsed.account_number}
      </span>
      {parsed.account_name ? (
        <span className="font-medium text-slate-800 dark:text-zinc-200 break-words">
          {parsed.account_name}
        </span>
      ) : null}
      {parsed.account_type && parsed.account_type.toLowerCase() !== "bank" && parsed.account_type.toLowerCase() !== "credit card" && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-slate-500">
          {parsed.account_type}
        </Badge>
      )}
    </div>
  );
}



