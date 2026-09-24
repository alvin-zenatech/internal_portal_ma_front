import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Globe2,
  Plus,
  X,
} from "lucide-react";
import { CountryAutocomplete } from "./CountryAutocomplete";
import {
  getCountryBankingSpec,
  type CountryBankingSpec,
} from "@/services/purchasingService";
import type { WireTransferInput } from "@/types/purchasing";

export interface FieldDef {
  id: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  isMono?: boolean;
  isUpper?: boolean;
}

export const BANK_DETAILS_CATALOG: FieldDef[] = [
  { id: "bank_country", label: "Bank Country", helperText: "Beneficiary bank jurisdiction" },
  { id: "bank_name", label: "Bank Name", placeholder: "e.g. CIBC, JPMorgan Chase, HSBC" },
  { id: "bank_account_number", label: "Bank Account #", placeholder: "Beneficiary account number", isMono: true },
  { id: "tax_id", label: "Tax ID / EIN", placeholder: "Tax ID or national business number" },
  { id: "region", label: "Region / Province / State", placeholder: "e.g. California, Ontario, Bavaria" },
];

export const CLEARING_CODES_CATALOG: FieldDef[] = [
  { id: "routing_wire", label: "Routing (Wire)", placeholder: "9-digit Wire Routing Number", isMono: true },
  { id: "routing_ach", label: "Routing (ACH)", placeholder: "9-digit ACH Routing Number", isMono: true },
  { id: "aba", label: "ABA Number", placeholder: "ABA Routing Number", isMono: true },
  { id: "swift_code", label: "SWIFT/BIC Code", placeholder: "8 or 11 character SWIFT/BIC", isMono: true, isUpper: true },
  { id: "iban", label: "IBAN", placeholder: "International Bank Account Number", isMono: true, isUpper: true },
  { id: "sort_code", label: "Sort Code", placeholder: "6-digit clearing code (e.g. 12-34-56)", isMono: true },
  { id: "transit_code_ca", label: "Transit Code", placeholder: "5-digit Canadian Transit Code", isMono: true },
  { id: "institution_code", label: "Institution Code", placeholder: "3-digit Canadian Institution Code", isMono: true },
  { id: "branch_code", label: "Branch Code", placeholder: "Branch / sub-branch code", isMono: true },
  { id: "bsb_australia", label: "BSB", placeholder: "6-digit BSB code (e.g. 123-456)", isMono: true },
  { id: "clearing_code", label: "Clearing Code", placeholder: "Local clearing or national routing code", isMono: true },
  { id: "bank_code", label: "Bank Code", placeholder: "National bank code / CNAPS", isMono: true },
  { id: "contact_name_china", label: "Contact Name", placeholder: "Local recipient contact name" },
];

export function getLocalCountryDefaults(countryStr?: string) {
  const c = (countryStr || "").trim().toLowerCase();
  if (c.includes("united states") || c === "us" || c === "usa") {
    return {
      required: ["bank_name", "bank_country", "bank_account_number", "routing_wire"],
      bankFields: ["bank_country", "bank_name", "bank_account_number"],
      clearingFields: ["routing_wire", "routing_ach", "swift_code"],
    };
  }
  if (c.includes("canada") || c === "ca") {
    return {
      required: ["bank_name", "bank_country", "bank_account_number", "transit_code_ca", "institution_code"],
      bankFields: ["bank_country", "bank_name", "bank_account_number"],
      clearingFields: ["transit_code_ca", "institution_code", "swift_code"],
    };
  }
  if (c.includes("united kingdom") || c === "gb" || c === "uk") {
    return {
      required: ["bank_name", "bank_country", "iban", "sort_code", "swift_code"],
      bankFields: ["bank_country", "bank_name", "bank_account_number"],
      clearingFields: ["iban", "sort_code", "swift_code"],
    };
  }
  if (c.includes("australia") || c === "au") {
    return {
      required: ["bank_name", "bank_country", "bank_account_number", "bsb_australia"],
      bankFields: ["bank_country", "bank_name", "bank_account_number"],
      clearingFields: ["bsb_australia", "swift_code"],
    };
  }
  if (c.includes("china") || c === "cn") {
    return {
      required: ["bank_name", "bank_country", "bank_account_number", "swift_code", "contact_name_china"],
      bankFields: ["bank_country", "bank_name", "bank_account_number"],
      clearingFields: ["swift_code", "contact_name_china", "bank_code"],
    };
  }
  const ibanCountries = [
    "germany", "de", "france", "fr", "ireland", "ie", "spain", "es", "italy", "it",
    "netherlands", "nl", "poland", "pl", "belgium", "be", "switzerland", "ch", "austria", "at",
    "portugal", "pt", "sweden", "se", "norway", "no", "denmark", "dk", "finland", "fi",
    "lithuania", "lt", "latvia", "lv", "estonia", "ee", "czech", "cz", "hungary", "hu",
    "greece", "gr", "luxembourg", "lu"
  ];
  if (ibanCountries.some(name => c === name || c.includes(name))) {
    return {
      required: ["bank_name", "bank_country", "iban", "swift_code"],
      bankFields: ["bank_country", "bank_name"],
      clearingFields: ["iban", "swift_code"],
    };
  }
  return {
    required: ["bank_name", "bank_country", "bank_account_number", "swift_code"],
    bankFields: ["bank_country", "bank_name", "bank_account_number"],
    clearingFields: ["swift_code", "clearing_code"],
  };
}

export interface WireBankingFieldsProps {
  form: WireTransferInput;
  setForm: React.Dispatch<React.SetStateAction<WireTransferInput>>;
  validationErrors?: Record<string, boolean>;
  setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function WireBankingFields({
  form,
  setForm,
  validationErrors = {},
  setValidationErrors,
}: WireBankingFieldsProps) {
  const [achSameAsWire, setAchSameAsWire] = useState(false);
  const [countrySpec, setCountrySpec] = useState<CountryBankingSpec | null>(null);

  const [visibleBankFields, setVisibleBankFields] = useState<string[]>([
    "bank_country",
    "bank_name",
    "bank_account_number",
  ]);
  const [visibleClearingFields, setVisibleClearingFields] = useState<string[]>([
    "routing_wire",
    "routing_ach",
    "swift_code",
  ]);
  const [requiredFieldKeys, setRequiredFieldKeys] = useState<Set<string>>(
    new Set(["bank_country", "bank_name", "bank_account_number", "routing_wire"])
  );

  const availableBankFields = useMemo(() => {
    return BANK_DETAILS_CATALOG.filter((f) => !visibleBankFields.includes(f.id));
  }, [visibleBankFields]);

  const availableClearingFields = useMemo(() => {
    return CLEARING_CODES_CATALOG.filter(
      (f) => !visibleClearingFields.includes(f.id)
    );
  }, [visibleClearingFields]);

  const [addBankFieldOpen, setAddBankFieldOpen] = useState(false);
  const [addClearingFieldOpen, setAddClearingFieldOpen] = useState(false);
  const addBankRef = useRef<HTMLDivElement>(null);
  const addClearingRef = useRef<HTMLDivElement>(null);
  const bankScrollRef = useRef<HTMLDivElement>(null);
  const clearingScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addBankRef.current && !addBankRef.current.contains(e.target as Node)) {
        setAddBankFieldOpen(false);
      }
      if (addClearingRef.current && !addClearingRef.current.contains(e.target as Node)) {
        setAddClearingFieldOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountryChange = async (country: string) => {
    setForm((prev) => ({ ...prev, bank_country: country }));
    setValidationErrors?.((prev) => ({ ...prev, bank_country: false }));

    const local = getLocalCountryDefaults(country);
    let spec: CountryBankingSpec | null = null;
    try {
      spec = await getCountryBankingSpec(country);
    } catch {
      // Fallback to local defaults
    }
    setCountrySpec(spec);

    const reqSet = new Set<string>(local.required);
    const bankSet = new Set<string>(local.bankFields);
    const clrSet = new Set<string>(local.clearingFields);

    if (spec) {
      if (spec.default_bank_fields) {
        spec.default_bank_fields.forEach((f) => {
          if (f.required) reqSet.add(f.id);
          bankSet.add(f.id);
        });
      }
      if (spec.default_clearing_fields) {
        spec.default_clearing_fields.forEach((f) => {
          if (f.required) reqSet.add(f.id);
          clrSet.add(f.id);
        });
      }
    }

    setRequiredFieldKeys(reqSet);
    setVisibleBankFields(Array.from(bankSet));
    setVisibleClearingFields(Array.from(clrSet));
  };

  const addBankField = (id: string) => {
    if (!visibleBankFields.includes(id)) {
      setVisibleBankFields((prev) => [...prev, id]);
    }
    setAddBankFieldOpen(false);
  };

  const removeBankField = (id: string) => {
    setVisibleBankFields((prev) => prev.filter((k) => k !== id));
    setForm((prev) => ({ ...prev, [id]: "" }));
    setValidationErrors?.((prev) => ({ ...prev, [id]: false }));
  };

  const addClearingField = (id: string) => {
    if (!visibleClearingFields.includes(id)) {
      setVisibleClearingFields((prev) => [...prev, id]);
    }
    setAddClearingFieldOpen(false);
  };

  const removeClearingField = (id: string) => {
    setVisibleClearingFields((prev) => prev.filter((k) => k !== id));
    setForm((prev) => ({ ...prev, [id]: "" }));
    setValidationErrors?.((prev) => ({ ...prev, [id]: false }));
  };

  return (
    <div className="space-y-4 pt-1">
      {/* CARD 1: BENEFICIARY BANK DETAILS */}
      <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <span>Beneficiary Bank Details</span>
                {countrySpec?.has_iban && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:text-emerald-400">
                    IBAN Country ({countrySpec.iban_length} chars)
                  </Badge>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Bank jurisdiction, institution identity, and beneficiary account
              </p>
            </div>
          </div>

          <div ref={addBankRef} className="relative flex items-center gap-2 shrink-0">
            {availableBankFields.length > 0 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddBankFieldOpen(!addBankFieldOpen)}
                  className="h-8 text-xs font-medium gap-1.5 border-dashed border-slate-300 dark:border-zinc-700 hover:bg-indigo-50/50 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Bank Field</span>
                </Button>

                {addBankFieldOpen && (
                  <div
                    data-radix-scroll-lock-ignore=""
                    className="absolute right-0 top-full mt-1 w-56 p-1 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                    style={{
                      boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                      Available Fields
                    </div>
                    <div
                      ref={bankScrollRef}
                      data-radix-scroll-lock-ignore=""
                      className="py-1 max-h-56 overflow-y-auto overscroll-contain"
                      style={{ scrollbarWidth: "thin", overscrollBehavior: "contain" }}
                    >
                      {availableBankFields.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => addBankField(f.id)}
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>{f.label}</span>
                          <Plus className="h-3 w-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <span className="text-[11px] text-slate-400 italic">All bank fields active</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {visibleBankFields.includes("bank_country") && (
            <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Bank Country <span className="text-red-500 font-bold">*</span>
                </label>
                {validationErrors.bank_country && (
                  <span className="text-[10px] text-red-500 font-medium">Required</span>
                )}
              </div>
              <CountryAutocomplete
                value={form.bank_country || ""}
                onChange={handleCountryChange}
                placeholder="Select bank country..."
              />
            </div>
          )}

          {visibleBankFields.includes("bank_name") && (
            <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Bank Name
                  {requiredFieldKeys.has("bank_name") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.bank_name && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("bank_name") && (
                    <button
                      type="button"
                      onClick={() => removeBankField("bank_name")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.bank_name || ""}
                onChange={(e) => {
                  setForm({ ...form, bank_name: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, bank_name: false }));
                }}
                placeholder="e.g. CIBC, JPMorgan Chase, HSBC"
                className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.bank_name ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleBankFields.includes("bank_account_number") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Bank Account #
                  {requiredFieldKeys.has("bank_account_number") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.bank_account_number && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("bank_account_number") && (
                    <button
                      type="button"
                      onClick={() => removeBankField("bank_account_number")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.bank_account_number || ""}
                onChange={(e) => {
                  setForm({ ...form, bank_account_number: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, bank_account_number: false }));
                }}
                placeholder="Account Number"
                className={`h-9 text-xs font-mono font-medium bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.bank_account_number ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleBankFields.includes("tax_id") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Tax ID / EIN
                  {requiredFieldKeys.has("tax_id") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.tax_id && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("tax_id") && (
                    <button
                      type="button"
                      onClick={() => removeBankField("tax_id")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.tax_id || ""}
                onChange={(e) => {
                  setForm({ ...form, tax_id: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, tax_id: false }));
                }}
                placeholder="Tax ID Number"
                className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.tax_id ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleBankFields.includes("region") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Region / Province / State
                  {requiredFieldKeys.has("region") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.region && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("region") && (
                    <button
                      type="button"
                      onClick={() => removeBankField("region")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.region || ""}
                onChange={(e) => {
                  setForm({ ...form, region: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, region: false }));
                }}
                placeholder="e.g. Ontario, California, Bavaria"
                className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.region ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: GLOBAL & REGIONAL CLEARING CODES */}
      <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Globe2 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <span>Global &amp; Regional Clearing Codes</span>
                <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300 dark:text-indigo-400">
                  {form.bank_country || "Selected Country"}
                </Badge>
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Routing numbers, SWIFT/BIC, IBAN, and domestic clearing identifiers
              </p>
            </div>
          </div>

          <div ref={addClearingRef} className="relative flex items-center gap-2 shrink-0">
            {availableClearingFields.length > 0 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddClearingFieldOpen(!addClearingFieldOpen)}
                  className="h-8 text-xs font-medium gap-1.5 border-dashed border-slate-300 dark:border-zinc-700 hover:bg-emerald-50/50 hover:text-emerald-600 hover:border-emerald-300 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Clearing Code</span>
                </Button>

                {addClearingFieldOpen && (
                  <div
                    data-radix-scroll-lock-ignore=""
                    className="absolute right-0 top-full mt-1 w-60 p-1 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                    style={{
                      boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                      Available Clearing Codes
                    </div>
                    <div
                      ref={clearingScrollRef}
                      data-radix-scroll-lock-ignore=""
                      className="py-1 max-h-56 overflow-y-auto overscroll-contain"
                      style={{
                        scrollbarWidth: "thin",
                        overscrollBehavior: "contain",
                      }}
                    >
                      {availableClearingFields.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => addClearingField(f.id)}
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>{f.label}</span>
                          <Plus className="h-3 w-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <span className="text-[11px] text-slate-400 italic">All clearing codes active</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {visibleClearingFields.includes("routing_wire") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Routing (Wire)
                  {requiredFieldKeys.has("routing_wire") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.routing_wire && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("routing_wire") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("routing_wire")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.routing_wire || ""}
                onChange={(e) => {
                  setForm({ ...form, routing_wire: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, routing_wire: false }));
                }}
                placeholder="9-digit Wire Routing Number"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.routing_wire ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("routing_ach") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Routing (ACH)
                  {requiredFieldKeys.has("routing_ach") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.routing_ach && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("routing_ach") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("routing_ach")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                disabled={achSameAsWire}
                value={form.routing_ach || ""}
                onChange={(e) => {
                  setForm({ ...form, routing_ach: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, routing_ach: false }));
                }}
                placeholder="9-digit ACH Routing Number"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  achSameAsWire ? "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-zinc-800" : ""
                } ${validationErrors.routing_ach ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="ach_same_wire"
                  checked={achSameAsWire}
                  onCheckedChange={(checked) => {
                    const isChecked = !!checked;
                    setAchSameAsWire(isChecked);
                    if (isChecked) {
                      setForm((prev) => ({ ...prev, routing_ach: prev.routing_wire || "" }));
                      setValidationErrors?.((prev) => ({ ...prev, routing_ach: false }));
                    }
                  }}
                />
                <label
                  htmlFor="ach_same_wire"
                  className="text-[11px] text-slate-600 dark:text-zinc-400 cursor-pointer select-none"
                >
                  Routing (ACH) is same as Routing (Wire)
                </label>
              </div>
            </div>
          )}

          {visibleClearingFields.includes("aba") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  ABA Number
                  {requiredFieldKeys.has("aba") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.aba && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("aba") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("aba")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.aba || ""}
                onChange={(e) => {
                  setForm({ ...form, aba: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, aba: false }));
                }}
                placeholder="ABA Routing Number"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.aba ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("swift_code") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  SWIFT / BIC Code
                  {requiredFieldKeys.has("swift_code") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.swift_code && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("swift_code") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("swift_code")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.swift_code || ""}
                onChange={(e) => {
                  setForm({ ...form, swift_code: e.target.value.toUpperCase() });
                  setValidationErrors?.((prev) => ({ ...prev, swift_code: false }));
                }}
                placeholder="8 or 11 chars (e.g. BOFAUS3N)"
                className={`h-9 text-xs font-mono uppercase bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.swift_code ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("iban") && (
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  IBAN
                  {requiredFieldKeys.has("iban") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.iban && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("iban") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("iban")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.iban || ""}
                onChange={(e) => {
                  setForm({ ...form, iban: e.target.value.toUpperCase().replace(/\s/g, "") });
                  setValidationErrors?.((prev) => ({ ...prev, iban: false }));
                }}
                placeholder="International Bank Account Number"
                className={`h-9 text-xs font-mono uppercase bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.iban ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("sort_code") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Sort Code (UK)
                  {requiredFieldKeys.has("sort_code") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.sort_code && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("sort_code") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("sort_code")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.sort_code || ""}
                onChange={(e) => {
                  setForm({ ...form, sort_code: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, sort_code: false }));
                }}
                placeholder="6 digits (e.g. 12-34-56)"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.sort_code ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("transit_code_ca") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Transit Code (Canada)
                  {requiredFieldKeys.has("transit_code_ca") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.transit_code_ca && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("transit_code_ca") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("transit_code_ca")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.transit_code_ca || ""}
                onChange={(e) => {
                  setForm({ ...form, transit_code_ca: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, transit_code_ca: false }));
                }}
                placeholder="5-digit transit"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.transit_code_ca ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("institution_code") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Institution Code (Canada)
                  {requiredFieldKeys.has("institution_code") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.institution_code && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("institution_code") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("institution_code")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.institution_code || ""}
                onChange={(e) => {
                  setForm({ ...form, institution_code: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, institution_code: false }));
                }}
                placeholder="3-digit institution (e.g. 004)"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.institution_code ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("bsb_australia") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  BSB (Australia)
                  {requiredFieldKeys.has("bsb_australia") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.bsb_australia && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("bsb_australia") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("bsb_australia")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.bsb_australia || ""}
                onChange={(e) => {
                  setForm({ ...form, bsb_australia: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, bsb_australia: false }));
                }}
                placeholder="6 digits (e.g. 123-456)"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.bsb_australia ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("clearing_code") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Clearing Code
                  {requiredFieldKeys.has("clearing_code") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.clearing_code && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("clearing_code") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("clearing_code")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.clearing_code || ""}
                onChange={(e) => {
                  setForm({ ...form, clearing_code: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, clearing_code: false }));
                }}
                placeholder="Domestic clearing identifier"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.clearing_code ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}

          {visibleClearingFields.includes("bank_code") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Bank Code / CNAPS
                  {requiredFieldKeys.has("bank_code") && (
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  {validationErrors.bank_code && (
                    <span className="text-[10px] text-red-500 font-medium">Required</span>
                  )}
                  {!requiredFieldKeys.has("bank_code") && (
                    <button
                      type="button"
                      onClick={() => removeClearingField("bank_code")}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove field"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Input
                value={form.bank_code || ""}
                onChange={(e) => {
                  setForm({ ...form, bank_code: e.target.value });
                  setValidationErrors?.((prev) => ({ ...prev, bank_code: false }));
                }}
                placeholder="Bank code or CNAPS"
                className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                  validationErrors.bank_code ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WireBankingFields;
