import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Landmark,
  Building2,
  Globe2,
  FileText,
  AlertCircle,
  SendHorizontal,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { WireGeneralPaymentFields } from "./WireGeneralPaymentFields";
import { CountryAutocomplete } from "./CountryAutocomplete";
import {
  getCountryBankingSpec,
  type CountryBankingSpec,
} from "@/services/purchasingService";
import type {
  PurchaseRequest,
  PurchaseOrder,
  WireTransferInput,
} from "@/types/purchasing";

interface FieldDef {
  id: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  isMono?: boolean;
  isUpper?: boolean;
}

const BANK_DETAILS_CATALOG: FieldDef[] = [
  { id: "bank_country", label: "Bank Country", helperText: "Beneficiary bank jurisdiction" },
  { id: "bank_name", label: "Bank Name", placeholder: "e.g. CIBC, JPMorgan Chase, HSBC" },
  { id: "bank_account_number", label: "Bank Account #", placeholder: "Beneficiary account number", isMono: true },
  { id: "tax_id", label: "Tax ID / EIN", placeholder: "Tax ID or national business number" },
  { id: "region", label: "Region / Province / State", placeholder: "e.g. California, Ontario, Bavaria" },
];

const CLEARING_CODES_CATALOG: FieldDef[] = [
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

// Fallback defaults mapped against AccountsPayableLog and schwifty requirements
function getLocalCountryDefaults(countryStr?: string) {
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
  // European / SEPA / IBAN countries (IBAN replaces bank account number)
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
  // Generic / Default
  return {
    required: ["bank_name", "bank_country", "bank_account_number", "swift_code"],
    bankFields: ["bank_country", "bank_name", "bank_account_number"],
    clearingFields: ["swift_code", "clearing_code"],
  };
}

interface WireTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PurchaseRequest;
  purchaseOrder?: PurchaseOrder | null;
  onConfirm: (data: WireTransferInput) => void;
  initialData?: WireTransferInput | null;
  isEditMode?: boolean;
  isSubmitting?: boolean;
  defaultTab?: "general" | "banking" | "international";
  visibleTabs?: Array<"general" | "banking" | "international">;
  title?: string;
  submitLabel?: string;
}

export function WireTransferDialog({
  open,
  onOpenChange,
  request,
  purchaseOrder,
  onConfirm,
  initialData,
  isEditMode = false,
  isSubmitting = false,
  defaultTab = "general",
  visibleTabs,
  title,
  submitLabel,
}: WireTransferDialogProps) {
  // Normalize visible tabs: combine banking and international into "banking"
  const normalizedTabs = useMemo(() => {
    if (!visibleTabs) return ["general", "banking"];
    const set = new Set<string>();
    visibleTabs.forEach((t) => {
      if (t === "general") set.add("general");
      if (t === "banking" || t === "international") set.add("banking");
    });
    return Array.from(set);
  }, [visibleTabs]);

  const initialTab = defaultTab === "international" ? "banking" : (defaultTab || normalizedTabs[0] || "general");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Routing ACH same as Wire Routing checkbox
  const [achSameAsWire, setAchSameAsWire] = useState(false);

  // Dynamic field tracking (clean defaults matching AccountsPayableLog and schwifty)
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
  const [countrySpec, setCountrySpec] = useState<CountryBankingSpec | null>(null);

  // Available fields that are NOT currently displayed (prevents duplicates)
  const availableBankFields = useMemo(() => {
    return BANK_DETAILS_CATALOG.filter((f) => !visibleBankFields.includes(f.id));
  }, [visibleBankFields]);

  const availableClearingFields = useMemo(() => {
    return CLEARING_CODES_CATALOG.filter(
      (f) => !visibleClearingFields.includes(f.id)
    );
  }, [visibleClearingFields]);


  // Add field dropdown popovers & refs for in-tree scrolling
  const [addBankFieldOpen, setAddBankFieldOpen] = useState(false);
  const [addClearingFieldOpen, setAddClearingFieldOpen] = useState(false);

  const addBankRef = useRef<HTMLDivElement>(null);
  const bankScrollRef = useRef<HTMLDivElement>(null);
  const addClearingRef = useRef<HTMLDivElement>(null);
  const clearingScrollRef = useRef<HTMLDivElement>(null);

  // Close add-field menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addClearingRef.current && !addClearingRef.current.contains(event.target as Node)) {
        setAddClearingFieldOpen(false);
      }
      if (addBankRef.current && !addBankRef.current.contains(event.target as Node)) {
        setAddBankFieldOpen(false);
      }
    }
    if (addClearingFieldOpen || addBankFieldOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [addClearingFieldOpen, addBankFieldOpen]);

  // Non-passive wheel handler for guaranteed scroll on Add Clearing Code dropdown
  useEffect(() => {
    const el = clearingScrollRef.current;
    if (!addClearingFieldOpen || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [addClearingFieldOpen, availableClearingFields]);

  // Non-passive wheel handler for guaranteed scroll on Add Bank Field dropdown
  useEffect(() => {
    const el = bankScrollRef.current;
    if (!addBankFieldOpen || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [addBankFieldOpen, availableBankFields]);


  const todayStr = new Date().toISOString().split("T")[0];

  const isScheduledOrRecurring =
    request.request_type === "SCHEDULED_PAYMENT" ||
    request.request_type === "RECURRING" ||
    Boolean(request.recurring_schedule);

  const fallbackVendor = isScheduledOrRecurring
    ? ""
    : (purchaseOrder?.vendor || request.product_info?.vendor || request.requester || "");

  const [form, setForm] = useState<WireTransferInput>({
    entered_by: "",
    entered_by_user_id: undefined,
    entry_date: todayStr,
    due_date: request.due_date || "",
    payment_date: todayStr,
    vendor: initialData?.vendor || fallbackVendor,
    is_new_vendor: false,
    pay_date: "Same Day",
    amount: purchaseOrder?.amount || request.amount || undefined,
    currency: purchaseOrder?.currency || request.currency || "USD",
    pay_from: "",
    invoice_number: "",
    comments: request.title ? `Payment for ${request.title}` : "",
    vendor_address: "",
    vendor_email: "",
    bank_name: "",
    tax_id: "",
    bank_country: "",
    routing_wire: "",
    routing_ach: "",
    bank_account_number: "",
    swift_code: "",
    sort_code: "",
    transit_code_ca: "",
    institution_code: "",
    branch_code: "",
    bsb_australia: "",
    clearing_code: "",
    bank_code: "",
    iban: "",
    bic: "",
    region: "",
    contact_name_china: "",
  });

  // Apply country spec dynamically
  const applyCountryIntelligence = (countryName: string, specData?: CountryBankingSpec | null) => {
    if (specData) {
      setCountrySpec(specData);
      const reqs = new Set<string>(["bank_country"]);
      specData.default_bank_fields.forEach((f) => {
        if (f.required) reqs.add(f.id);
      });
      specData.default_clearing_fields.forEach((f) => {
        if (f.required) reqs.add(f.id);
      });
      setRequiredFieldKeys(reqs);

      // Union country defaults with currently populated values so user data is never hidden
      const bSet = new Set(specData.default_bank_fields.map((f) => f.id));
      const cSet = new Set(specData.default_clearing_fields.map((f) => f.id));

      // Include existing populated fields
      BANK_DETAILS_CATALOG.forEach((f) => {
        const val = form[f.id as keyof WireTransferInput];
        if (val && String(val).trim()) bSet.add(f.id);
      });
      CLEARING_CODES_CATALOG.forEach((f) => {
        const val = form[f.id as keyof WireTransferInput];
        if (val && String(val).trim()) cSet.add(f.id);
      });

      setVisibleBankFields(Array.from(bSet));
      setVisibleClearingFields(Array.from(cSet));
    } else {
      const local = getLocalCountryDefaults(countryName);
      const reqs = new Set<string>(local.required);
      setRequiredFieldKeys(reqs);

      const bSet = new Set(local.bankFields);
      const cSet = new Set(local.clearingFields);

      BANK_DETAILS_CATALOG.forEach((f) => {
        const val = form[f.id as keyof WireTransferInput];
        if (val && String(val).trim()) bSet.add(f.id);
      });
      CLEARING_CODES_CATALOG.forEach((f) => {
        const val = form[f.id as keyof WireTransferInput];
        if (val && String(val).trim()) cSet.add(f.id);
      });

      setVisibleBankFields(Array.from(bSet));
      setVisibleClearingFields(Array.from(cSet));
    }
  };

  const handleCountryChange = (countryName: string) => {
    setForm((prev) => ({ ...prev, bank_country: countryName }));
    setValidationErrors((prev) => ({ ...prev, bank_country: false }));

    // Apply immediate local heuristics for instant responsiveness
    applyCountryIntelligence(countryName, null);

    // Call schwifty backend endpoint
    getCountryBankingSpec(countryName)
      .then((spec) => {
        if (spec && spec.code) {
          applyCountryIntelligence(countryName, spec);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend country banking spec:", err);
      });
  };

  // Sync ACH routing if checkbox is checked
  useEffect(() => {
    if (achSameAsWire && form.routing_wire !== undefined) {
      setForm((prev) => ({ ...prev, routing_ach: prev.routing_wire || "" }));
    }
  }, [achSameAsWire, form.routing_wire]);

  useEffect(() => {
    if (open) {
      const nextTab = defaultTab === "international" ? "banking" : (defaultTab || normalizedTabs[0] || "general");
      setActiveTab(nextTab);
      setValidationErrors({});

      if (initialData) {
        const initialCountry = initialData.bank_country || "United States";
        const isSame =
          Boolean(initialData.routing_wire) &&
          initialData.routing_wire === initialData.routing_ach;
        setAchSameAsWire(isSame);

        setForm({
          entered_by: initialData.entered_by || "",
          entered_by_user_id: initialData.entered_by_user_id || undefined,
          entry_date: initialData.entry_date || todayStr,
          due_date: initialData.due_date || "",
          payment_date: initialData.payment_date || todayStr,
          vendor: initialData.vendor || fallbackVendor,
          is_new_vendor: !!initialData.is_new_vendor,
          pay_date: initialData.pay_date || "Same Day",
          amount: initialData.amount || purchaseOrder?.amount || request.amount || undefined,
          currency: initialData.currency || purchaseOrder?.currency || request.currency || "USD",
          pay_from: initialData.pay_from || "",
          invoice_number: initialData.invoice_number || "",
          comments: initialData.comments || "",
          vendor_address: initialData.vendor_address || "",
          vendor_email: initialData.vendor_email || "",
          bank_name: initialData.bank_name || "",
          tax_id: initialData.tax_id || "",
          bank_country: initialCountry,
          routing_wire: initialData.routing_wire || "",
          routing_ach: initialData.routing_ach || "",
          bank_account_number: initialData.bank_account_number || "",
          swift_code: initialData.swift_code || initialData.bic || "",
          sort_code: initialData.sort_code || "",
          transit_code_ca: initialData.transit_code_ca || "",
          institution_code: initialData.institution_code || "",
          branch_code: initialData.branch_code || "",
          bsb_australia: initialData.bsb_australia || "",
          clearing_code: initialData.clearing_code || "",
          bank_code: initialData.bank_code || "",
          iban: initialData.iban || "",
          bic: initialData.bic || initialData.swift_code || "",
          region: initialData.region || "",
          contact_name_china: initialData.contact_name_china || "",
        });

        // Trigger intelligence for initial country
        handleCountryChange(initialCountry);
      } else {
        const defaultCountry = "United States";
        setForm((prev) => ({
          ...prev,
          entry_date: todayStr,
          payment_date: todayStr,
          vendor: fallbackVendor,
          amount: purchaseOrder?.amount || request.amount || prev.amount,
          currency: purchaseOrder?.currency || request.currency || prev.currency || "USD",
          bank_country: defaultCountry,
        }));
        handleCountryChange(defaultCountry);
      }
    }
  }, [open, request, purchaseOrder, todayStr, initialData, defaultTab, normalizedTabs, fallbackVendor]);

  const cleanDate = (d?: string | null) => {
    if (!d || d.trim() === "" || d === "null" || d === "undefined") return undefined;
    return d.trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};

    // Validate Tab 1 if visible
    if (normalizedTabs.includes("general")) {
      if (!form.entered_by?.trim()) newErrors.entered_by = true;
      if (!form.entry_date?.trim()) newErrors.entry_date = true;
      if (!form.vendor?.trim()) newErrors.vendor = true;
      if (!form.amount || Number(form.amount) <= 0) newErrors.amount = true;
      if (!form.pay_from?.trim()) newErrors.pay_from = true;

      if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        toast.error("Please fill in all required fields marked with * in General & Payment.");
        setActiveTab("general");
        return;
      }
    }

    // Validate Bank & Clearing required fields
    for (const reqKey of requiredFieldKeys) {
      const val = form[reqKey as keyof WireTransferInput];
      if (val === undefined || val === null || String(val).trim() === "") {
        newErrors[reqKey] = true;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      if (normalizedTabs.includes("banking")) {
        setActiveTab("banking");
      }
      toast.error("Please fill in all required fields marked with *.");
      return;
    }

    setValidationErrors({});

    onConfirm({
      ...form,
      amount: Number(form.amount) || 0,
      entry_date: cleanDate(form.entry_date),
      due_date: cleanDate(form.due_date),
      payment_date: cleanDate(form.payment_date),
      bic: form.swift_code || form.bic, // keep bic synced
    });
  };

  // Add / Remove Field Handlers (NO DUPLICATES ALLOWED)
  const addBankField = (fieldId: string) => {
    if (!visibleBankFields.includes(fieldId)) {
      setVisibleBankFields((prev) => [...prev, fieldId]);
    }
    setAddBankFieldOpen(false);
  };

  const removeBankField = (fieldId: string) => {
    if (requiredFieldKeys.has(fieldId)) return;
    setVisibleBankFields((prev) => prev.filter((id) => id !== fieldId));
    setForm((prev) => ({ ...prev, [fieldId]: "" }));
  };

  const addClearingField = (fieldId: string) => {
    if (!visibleClearingFields.includes(fieldId)) {
      setVisibleClearingFields((prev) => [...prev, fieldId]);
    }
    setAddClearingFieldOpen(false);
  };

  const removeClearingField = (fieldId: string) => {
    if (requiredFieldKeys.has(fieldId)) return;
    setVisibleClearingFields((prev) => prev.filter((id) => id !== fieldId));
    setForm((prev) => ({ ...prev, [fieldId]: "" }));
  };


  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setShowDiscardConfirm(true);
          } else {
            onOpenChange(true);
          }
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            setShowDiscardConfirm(true);
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setShowDiscardConfirm(true);
          }}
          className="!w-[92vw] !max-w-[1000px] sm:!max-w-[1000px] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl"
          style={{ width: "92vw", maxWidth: "1000px" }}
        >
          {/* FIXED HEADER */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/70 shrink-0">
            <DialogHeader className="p-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 truncate flex items-center gap-2">
                      <span>{title || (isEditMode ? "Edit Wire Transfer" : "Wire Transfer Information")}</span>
                      <span className="text-muted-foreground font-normal text-sm">· Request #{request.id}</span>
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {isEditMode
                        ? "Update wire payment instructions, routing, and beneficiary clearing details."
                        : "Complete the wire transfer and clearing details according to the beneficiary bank jurisdiction."}
                    </p>
                  </div>
                </div>

              </div>
            </DialogHeader>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              {/* TABS SELECTOR (Hidden if only 1 tab is visible, saving space) */}
              {normalizedTabs.length > 1 && (
                <div className="px-6 pt-3.5 pb-2.5 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
                  <TabsList className="grid grid-cols-2 max-w-sm w-full h-9">
                    {normalizedTabs.includes("general") && (
                      <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        General &amp; Payment
                      </TabsTrigger>
                    )}
                    {normalizedTabs.includes("banking") && (
                      <TabsTrigger value="banking" className="flex items-center gap-1.5 text-xs">
                        <Building2 className="w-3.5 h-3.5" />
                        Bank &amp; Clearing Details
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>
              )}

              {/* SCROLLABLE BODY */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
                {/* TAB 1: GENERAL & PAYMENT */}
                {normalizedTabs.includes("general") && (
                  <TabsContent value="general" className="space-y-4 mt-0">
                    <WireGeneralPaymentFields
                      form={form}
                      setForm={setForm}
                      validationErrors={validationErrors}
                      onClearValidationError={(k) =>
                        setValidationErrors((prev) => ({ ...prev, [k]: false }))
                      }
                      isSubmitting={isSubmitting}
                    />
                  </TabsContent>
                )}

                {/* COMBINED TAB 2: BANK & CLEARING DETAILS */}
                {normalizedTabs.includes("banking") && (
                  <TabsContent value="banking" className="space-y-4 mt-0">
                    {/* CARD 1: BENEFICIARY BANK DETAILS */}
                    <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-2xs space-y-4">
                      {/* CARD HEADER */}
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

                        {/* ADD BANK FIELD (NO DUPLICATES, IN-TREE SCROLLABLE DROPDOWN) */}
                        <div ref={addBankRef} className="relative flex items-center gap-2 shrink-0">
                          {availableBankFields.length > 0 ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAddBankFieldOpen(!addBankFieldOpen)}
                                className="h-8 text-xs font-medium gap-1.5 border-dashed border-slate-300 dark:border-zinc-700 hover:bg-indigo-50/50 hover:text-indigo-600 hover:border-indigo-300"
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
                                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center justify-between transition-colors"
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

                      {/* FIELDS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {/* Bank Country (Autocomplete) */}
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

                        {/* Bank Name */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, bank_name: false }));
                              }}
                              placeholder="e.g. CIBC, JPMorgan Chase, HSBC"
                              className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                                validationErrors.bank_name ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                            />
                          </div>
                        )}

                        {/* Bank Account Number */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, bank_account_number: false }));
                              }}
                              placeholder="Account Number"
                              className={`h-9 text-xs font-mono font-medium bg-slate-50/50 dark:bg-zinc-800/50 ${
                                validationErrors.bank_account_number ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                            />
                          </div>
                        )}

                        {/* Tax ID */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, tax_id: false }));
                              }}
                              placeholder="Tax ID Number"
                              className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                                validationErrors.tax_id ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                            />
                          </div>
                        )}

                        {/* Region / Province */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, region: false }));
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
                      {/* CARD HEADER */}
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

                        {/* ADD CLEARING FIELD BUTTON (NO DUPLICATES, IN-TREE SCROLLABLE DROPDOWN) */}
                        <div ref={addClearingRef} className="relative flex items-center gap-2 shrink-0">
                          {availableClearingFields.length > 0 ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAddClearingFieldOpen(!addClearingFieldOpen)}
                                className="h-8 text-xs font-medium gap-1.5 border-dashed border-slate-300 dark:border-zinc-700 hover:bg-emerald-50/50 hover:text-emerald-600 hover:border-emerald-300"
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
                                      WebkitOverflowScrolling: "touch",
                                    }}
                                  >
                                    {availableClearingFields.map((f) => (
                                      <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => addClearingField(f.id)}
                                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center justify-between transition-colors"
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

                      {/* DYNAMIC CLEARING CODES GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {/* Routing Wire */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, routing_wire: false }));
                              }}
                              placeholder="9-digit Wire Routing Number"
                              className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                                validationErrors.routing_wire ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                            />
                          </div>
                        )}

                        {/* Routing ACH (with checkmark for same as Wire) */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, routing_ach: false }));
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
                                    setValidationErrors((prev) => ({ ...prev, routing_ach: false }));
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

                        {/* ABA */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                setValidationErrors((prev) => ({ ...prev, aba: false }));
                              }}
                              placeholder="ABA Number"
                              className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                                validationErrors.aba ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                            />
                          </div>
                        )}

                        {/* SWIFT / BIC Code */}
                        {visibleClearingFields.includes("swift_code") && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                SWIFT/BIC Code
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove field"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <Input
                              value={form.swift_code || form.bic || ""}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setForm({ ...form, swift_code: val, bic: val });
                                setValidationErrors((prev) => ({ ...prev, swift_code: false }));
                              }}
                              placeholder="e.g. CIBCCATT or CHASUS33"
                              className={`h-9 text-xs font-mono uppercase bg-slate-50/50 dark:bg-zinc-800/50 ${
                                validationErrors.swift_code ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                            />
                          </div>
                        )}

                        {/* IBAN */}
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
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                              const val = e.target.value.toUpperCase();
                              setForm({ ...form, iban: val });
                              setValidationErrors((prev) => ({ ...prev, iban: false }));
                            }}
                            placeholder={countrySpec?.iban_length ? `IBAN (${countrySpec.iban_length} characters)` : "International Bank Account Number"}
                            className={`h-9 text-xs font-mono uppercase bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.iban ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Sort Code */}
                      {visibleClearingFields.includes("sort_code") && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Sort Code
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
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                              setValidationErrors((prev) => ({ ...prev, sort_code: false }));
                            }}
                            placeholder="6-digit code (e.g. 20-00-00)"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.sort_code ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Transit Code */}
                      {visibleClearingFields.includes("transit_code_ca") && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Transit Code
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
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                              setValidationErrors((prev) => ({ ...prev, transit_code_ca: false }));
                            }}
                            placeholder="5-digit Transit Code (e.g. 00303)"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.transit_code_ca ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Institution Code */}
                      {visibleClearingFields.includes("institution_code") && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Institution Code
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
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                              setValidationErrors((prev) => ({ ...prev, institution_code: false }));
                            }}
                            placeholder="3-digit Institution Code (e.g. 0010)"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.institution_code ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* BSB */}
                      {visibleClearingFields.includes("bsb_australia") && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              BSB
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
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                              setValidationErrors((prev) => ({ ...prev, bsb_australia: false }));
                            }}
                            placeholder="6-digit BSB (e.g. 123-456)"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.bsb_australia ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Bank Code */}
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
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                              setValidationErrors((prev) => ({ ...prev, bank_code: false }));
                            }}
                            placeholder="Bank Code"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.bank_code ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Branch Code */}
                      {visibleClearingFields.includes("branch_code") && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Branch Code
                              {requiredFieldKeys.has("branch_code") && (
                                <span className="text-red-500 font-bold ml-0.5">*</span>
                              )}
                            </label>
                            <div className="flex items-center gap-1.5">
                              {validationErrors.branch_code && (
                                <span className="text-[10px] text-red-500 font-medium">Required</span>
                              )}
                              {!requiredFieldKeys.has("branch_code") && (
                                <button
                                  type="button"
                                  onClick={() => removeClearingField("branch_code")}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Remove field"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <Input
                            value={form.branch_code || ""}
                            onChange={(e) => {
                              setForm({ ...form, branch_code: e.target.value });
                              setValidationErrors((prev) => ({ ...prev, branch_code: false }));
                            }}
                            placeholder="Branch Code"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.branch_code ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Clearing Code */}
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
                                  className="text-slate-400 hover:text-red-500 transition-colors"
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
                              setValidationErrors((prev) => ({ ...prev, clearing_code: false }));
                            }}
                            placeholder="Clearing Code / CLABE / IFSC"
                            className={`h-9 text-xs font-mono bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.clearing_code ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Contact Name */}
                      {visibleClearingFields.includes("contact_name_china") && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              Contact Name
                              {requiredFieldKeys.has("contact_name_china") && (
                                <span className="text-red-500 font-bold ml-0.5">*</span>
                              )}
                            </label>
                            <div className="flex items-center gap-1.5">
                              {validationErrors.contact_name_china && (
                                <span className="text-[10px] text-red-500 font-medium">Required</span>
                              )}
                              {!requiredFieldKeys.has("contact_name_china") && (
                                <button
                                  type="button"
                                  onClick={() => removeClearingField("contact_name_china")}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Remove field"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <Input
                            value={form.contact_name_china || ""}
                            onChange={(e) => {
                              setForm({ ...form, contact_name_china: e.target.value });
                              setValidationErrors((prev) => ({ ...prev, contact_name_china: false }));
                            }}
                            placeholder="Recipient contact person full name"
                            className={`h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50 ${
                              validationErrors.contact_name_china ? "border-red-500 focus-visible:ring-red-500" : ""
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              )}
              </div>
            </Tabs>

            {/* FIXED FOOTER WITH GENEROUS PADDING & MARGIN */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/95 dark:bg-zinc-900/80 shrink-0 mt-auto">
              <DialogFooter className="p-0 m-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2 py-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Treasury & AP settlement audit trail will be logged upon submission.</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 my-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDiscardConfirm(true)}
                    disabled={isSubmitting}
                    className="h-10 px-5 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all rounded-lg flex items-center gap-2"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {submitLabel || (isEditMode ? "Save Changes" : "Confirm Wire & Mark Purchased")}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DISCARD CONFIRMATION MODAL */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle>Discard Wire Information?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs mt-1">
                  You have unsaved wire transfer details. Are you sure you want to discard your changes and close?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction
              type="button"
              onClick={() => setShowDiscardConfirm(false)}
            >
              Stay
            </AlertDialogAction>
            <AlertDialogCancel
              type="button"
              onClick={() => {
                setShowDiscardConfirm(false);
                onOpenChange(false);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              Discard
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
