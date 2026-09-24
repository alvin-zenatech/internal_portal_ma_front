import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  DollarSign,
  MapPin,
  AlertCircle,
  Building,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";
import {
  getAPUsers,
  getTreasuryUsers,
  getKnownVendors,
  getPayFromEntities,
} from "@/services/purchasingService";
import { CurrencyAutocomplete } from "./CurrencyAutocomplete";
import { CreatableCombobox } from "./CreatableCombobox";
import type { WireTransferInput } from "@/types/purchasing";
import { useKnownVendors } from "@/hooks/usePurchasing";

export const COMMON_PAY_FROM = [
  "Weddle",
  "Laventure",
  "DaaS",
  "A&J",
  "Rampart",
  "Spiewack",
  "Wallace",
  "Zenatech",
];

export const COMMON_CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "CNY"];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "C$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CNY: "¥",
  JPY: "¥",
  CHF: "Fr",
  MXN: "Mex$",
  INR: "₹",
};

interface WireGeneralPaymentFieldsProps {
  form: WireTransferInput;
  setForm: React.Dispatch<React.SetStateAction<WireTransferInput>>;
  validationErrors?: Record<string, boolean>;
  onClearValidationError?: (field: string) => void;
  isSubmitting?: boolean;
  onAmountChange?: (amt: number) => void;
  onCurrencyChange?: (curr: string) => void;
  onDueDateChange?: (d: string) => void;
  onVendorChange?: (v: string) => void;
}

export function WireGeneralPaymentFields({
  form,
  setForm,
  validationErrors = {},
  onClearValidationError,
  isSubmitting = false,
  onAmountChange,
  onCurrencyChange,
  onDueDateChange,
  onVendorChange,
}: WireGeneralPaymentFieldsProps) {
  const { data: knownVendors = [] } = useKnownVendors();
  const [apUsers, setApUsers] = useState<
    Array<{ id: string; full_name: string; email: string; department?: string }>
  >([]);
  const [enteredByQuery, setEnteredByQuery] = useState(form.entered_by || "");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    getAPUsers()
      .then((users) => setApUsers(users || []))
      .catch((err) => {
        console.error("Failed to load AP users, trying treasury fallback", err);
        getTreasuryUsers()
          .then((users) => setApUsers(users || []))
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    if (form.entered_by !== undefined && form.entered_by !== enteredByQuery) {
      setEnteredByQuery(form.entered_by || "");
    }
  }, [form.entered_by]);

  const filteredAPUsers = useMemo(() => {
    const q = enteredByQuery.toLowerCase().trim();
    if (!q) return apUsers.slice(0, 8);
    return apUsers.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [apUsers, enteredByQuery]);

  const handleInvoiceChange = (val: string) => {
    const sanitized = val.replace(/[^a-zA-Z0-9\-_]/g, "");
    setForm((prev) => ({ ...prev, invoice_number: sanitized }));
  };

  const handleCurrencyChange = (newCurrency: string) => {
    const code = (newCurrency || "USD").trim().toUpperCase();
    setForm((prev) => ({
      ...prev,
      currency: code,
    }));
    onCurrencyChange?.(code);
  };

  const [amountInput, setAmountInput] = useState<string>(() => {
    return form.amount !== undefined && form.amount !== null && Number(form.amount) > 0
      ? String(form.amount)
      : "";
  });

  useEffect(() => {
    const num = Number(form.amount);
    if (form.amount === undefined || form.amount === null || isNaN(num) || num === 0) {
      if (amountInput !== "" && Number(amountInput) !== 0) {
        setAmountInput("");
      }
    } else if (Number(amountInput) !== num) {
      setAmountInput(String(form.amount));
    }
  }, [form.amount]);

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[$,]/g, "");

    if (raw === "") {
      setAmountInput("");
      setForm((prev) => ({ ...prev, amount: undefined }));
      onAmountChange?.(0);
      return;
    }

    if (!/^\d*\.?\d*$/.test(raw)) {
      return;
    }

    // If typing digits after 0 (e.g. "05" -> "5", but keep "0." or "0")
    if (raw.length > 1 && raw.startsWith("0") && raw[1] !== ".") {
      raw = raw.replace(/^0+/, "");
      if (raw === "") raw = "0";
    }

    setAmountInput(raw);
    const parsed = parseFloat(raw);
    const numericVal = isNaN(parsed) ? 0 : parsed;
    setForm((prev) => ({ ...prev, amount: numericVal }));
    onAmountChange?.(numericVal);
    onClearValidationError?.("amount");
  };

  const handleAmountInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (amountInput === "0" || amountInput === "0.00" || amountInput === "0.0") {
      setAmountInput("");
      setForm((prev) => ({ ...prev, amount: undefined }));
      onAmountChange?.(0);
    } else if (amountInput) {
      e.target.select();
    }
  };

  const handleAmountInputBlur = () => {
    if (amountInput === "" || amountInput === ".") {
      setAmountInput("");
      setForm((prev) => ({ ...prev, amount: undefined }));
      onAmountChange?.(0);
    } else {
      const parsed = parseFloat(amountInput);
      if (!isNaN(parsed) && parsed > 0) {
        setForm((prev) => ({ ...prev, amount: parsed }));
        onAmountChange?.(parsed);
      } else {
        setAmountInput("");
        setForm((prev) => ({ ...prev, amount: undefined }));
        onAmountChange?.(0);
      }
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Processing & Entry Card */}
      <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
          <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <User className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Processing &amp; Entry
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              AP operator record and entry date
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Entered By */}
          <div className="relative space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Entered By <span className="text-red-500">*</span></span>
              </label>
              {validationErrors.entered_by && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Required
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                value={enteredByQuery}
                onChange={(e) => {
                  setEnteredByQuery(e.target.value);
                  setForm((prev) => ({ ...prev, entered_by: e.target.value, entered_by_user_id: undefined }));
                  setShowUserDropdown(true);
                  onClearValidationError?.("entered_by");
                }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search AP user (e.g. David Hernandez)..."
                className={`h-9 text-xs pl-8 bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.entered_by ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            </div>

            {showUserDropdown && filteredAPUsers.length > 0 && (
              <div
                data-radix-scroll-lock-ignore=""
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                style={{ scrollbarWidth: "thin", overscrollBehavior: "contain" }}
                className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto overscroll-contain bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1"
              >
                {filteredAPUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors"
                    onClick={() => {
                      const selectedName = (u.full_name || "").trim();
                      setForm((prev) => ({
                        ...prev,
                        entered_by: selectedName,
                        entered_by_user_id: u.id,
                      }));
                      setEnteredByQuery(selectedName);
                      setShowUserDropdown(false);
                      onClearValidationError?.("entered_by");
                    }}
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200">{u.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </div>
                    {u.department && (
                      <Badge variant="secondary" className="text-[10px]">{u.department}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entry Date */}
          <div className="space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Entry Date <span className="text-red-500">*</span></span>
              </label>
              {validationErrors.entry_date && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Required
                </span>
              )}
            </div>
            <Input
              type="date"
              value={form.entry_date || ""}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, entry_date: e.target.value }));
                onClearValidationError?.("entry_date");
              }}
              className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                validationErrors.entry_date ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2. Payment & Settlement Details Card */}
      <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
          <div className="h-6 w-6 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Payment &amp; Settlement Details
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Vendor payee, paying entity, amount, currency, invoice, and settlement terms
            </p>
          </div>
        </div>

        {/* Row 1: Vendor & Pay From (2 Equal Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Vendor Name */}
          <div className="space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>Vendor / Beneficiary Name <span className="text-red-500">*</span></span>
              </label>
              {validationErrors.vendor && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Required
                </span>
              )}
            </div>
            <CreatableCombobox
              required
              value={form.vendor || ""}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, vendor: val }));
                onVendorChange?.(val);
                onClearValidationError?.("vendor");
              }}
              options={knownVendors}
              fetchOptions={getKnownVendors}
              placeholder="Search or enter vendor name (e.g. Acme Corp)"
              addLabelPrefix="Add new vendor"
              entityTypeLabel="Vendor"
              hasError={!!validationErrors.vendor}
              disabled={isSubmitting}
              icon={<Building className="h-3.5 w-3.5" />}
            />
          </div>

          {/* Pay From Entity */}
          <div className="space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>Pay From (Entity / Subsidiary) <span className="text-red-500">*</span></span>
              </label>
              {validationErrors.pay_from && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Required
                </span>
              )}
            </div>
            <CreatableCombobox
              required
              value={form.pay_from || ""}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, pay_from: val }));
                onClearValidationError?.("pay_from");
              }}
              options={COMMON_PAY_FROM}
              fetchOptions={getPayFromEntities}
              placeholder="Select or enter paying entity (e.g. Weddle, Zenatech)"
              addLabelPrefix="Add new entity"
              entityTypeLabel="Entity"
              hasError={!!validationErrors.pay_from}
              disabled={isSubmitting}
              icon={<Building className="h-3.5 w-3.5" />}
            />
          </div>
        </div>

        {/* Row 2: Amount, Currency, Invoice # (3 Equal Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Amount */}
          <div className="space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                <span>Payment Amount <span className="text-red-500">*</span></span>
              </label>
              {validationErrors.amount && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Required
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-slate-400 font-mono">
                {CURRENCY_SYMBOLS[(form.currency || "USD").toUpperCase()] || "$"}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amountInput}
                onChange={handleAmountInputChange}
                onFocus={handleAmountInputFocus}
                onBlur={handleAmountInputBlur}
                className={`h-9 text-xs font-semibold pl-7 text-indigo-700 dark:text-indigo-300 bg-slate-50/50 dark:bg-zinc-800/50 font-mono ${
                  validationErrors.amount ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Currency</label>
              <div className="flex items-center gap-1">
                {COMMON_CURRENCIES.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCurrencyChange(c)}
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium border transition-colors ${
                      (form.currency || "USD").toUpperCase() === c
                        ? "bg-indigo-100 dark:bg-indigo-900/60 border-indigo-400 text-indigo-800 dark:text-indigo-200 font-bold"
                        : "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <CurrencyAutocomplete
              value={form.currency || "USD"}
              onChange={handleCurrencyChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Invoice # */}
          <div className="space-y-1.5">
            <div className="h-5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Invoice # <span className="text-slate-400 font-normal">(optional)</span></span>
              </label>
            </div>
            <Input
              value={form.invoice_number || ""}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              placeholder="e.g. INV-1094"
              className="h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>
        </div>

        {/* Row 3: Dates & Terms (3 Equal Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <div className="h-5 flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Due Date</span>
              </label>
            </div>
            <Input
              type="date"
              value={form.due_date || ""}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, due_date: e.target.value }));
                onDueDateChange?.(e.target.value);
              }}
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="h-5 flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Scheduled Payment Date</span>
              </label>
            </div>
            <Input
              type="date"
              value={form.payment_date || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="h-5 flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Pay Date / Terms</span>
              </label>
            </div>
            <Input
              value={form.pay_date || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, pay_date: e.target.value }))}
              placeholder="e.g. Same Day, Net 30"
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>
        </div>

        {/* Row 4: Comments / Memo (Full Width) */}
        <div className="space-y-1.5">
          <div className="h-5 flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Payment Memo / Comments</span>
            </label>
          </div>
          <Input
            value={form.comments || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
            placeholder="e.g. August Software License, Office lease payment..."
            className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
          />
        </div>
      </div>

      {/* 3. Vendor Contact & Location Card */}
      <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
          <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Vendor Contact &amp; Location Details
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Vendor email, contact person, region, and street address
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <div className="h-5 flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Vendor Email</label>
            </div>
            <Input
              type="email"
              value={form.vendor_email || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, vendor_email: e.target.value }))}
              placeholder="billing@vendor.com"
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="h-5 flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Contact Person (China / Overseas)</label>
            </div>
            <Input
              value={form.contact_name_china || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, contact_name_china: e.target.value }))}
              placeholder="Contact Name"
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="h-5 flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Region / State</label>
            </div>
            <Input
              value={form.region || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
              placeholder="e.g. California, Ontario, Guangdong"
              className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-5 flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Vendor Street Address</label>
          </div>
          <Input
            value={form.vendor_address || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, vendor_address: e.target.value }))}
            placeholder="Street address, suite, city, state, postal code, country"
            className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
          />
        </div>
      </div>
    </div>
  );
}
