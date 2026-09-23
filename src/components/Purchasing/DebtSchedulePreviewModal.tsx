import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  CreditCard,
  Calendar,
  Loader2,
  X,
  Coins,
  Trash2,
  RotateCcw,
  Pencil,
  Save,
} from "lucide-react";

export interface DebtSchedulePreviewRecord {
  payee: string;
  title: string;
  description: string;
  currency: string;
  amount: number;
  due_date: string | null;
  recurring_schedule: {
    is_scheduled: boolean;
    frequency: string;
    payment_method?: string;
    start_date: string;
    end_date?: string | null;
    total_installments?: number | null;
    completed_installments: number;
    amount_per_cycle?: number | null;
    total_amount?: number | null;
    custom_dates?: string[] | null;
    schedule_dates?: Array<{
      date: string;
      amount?: number | null;
      note?: string | null;
    }> | null;
  };
  installments_count: number;
  completed_installments: number;
  total_amount: number;
}

export interface DebtSchedulePreviewData {
  success: boolean;
  total_records: number;
  default_requester: string;
  default_department: string;
  default_payment_method: string;
  default_review_status?: string;
  currencies: Record<
    string,
    {
      count: number;
      total_upcoming: number;
      total_principal: number;
    }
  >;
  records: DebtSchedulePreviewRecord[];
}

interface DebtSchedulePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: DebtSchedulePreviewData | null;
  fileName?: string;
  onSave: (clearExisting: boolean, records?: DebtSchedulePreviewRecord[]) => Promise<void>;
  isSaving: boolean;
}

const SUPPORTED_CURRENCIES = ["USD", "CAD", "GBP", "AUD", "EUR"];

export const DebtSchedulePreviewModal: React.FC<DebtSchedulePreviewModalProps> = ({
  open,
  onOpenChange,
  previewData,
  fileName,
  onSave,
  isSaving,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");
  const [clearExisting, setClearExisting] = useState<boolean>(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [records, setRecords] = useState<DebtSchedulePreviewRecord[]>([]);

  // Editing single record modal state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<DebtSchedulePreviewRecord | null>(null);

  // Initialize editable copy whenever previewData opens
  useEffect(() => {
    if (previewData?.records) {
      setRecords(JSON.parse(JSON.stringify(previewData.records)));
    } else {
      setRecords([]);
    }
    setExpandedRows({});
    setEditingIndex(null);
    setEditFormData(null);
  }, [previewData]);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleReset = () => {
    if (previewData?.records) {
      setRecords(JSON.parse(JSON.stringify(previewData.records)));
      setEditingIndex(null);
      setEditFormData(null);
    }
  };

  const handleDeleteRecord = (targetIdx: number) => {
    setRecords((prev) => prev.filter((_, idx) => idx !== targetIdx));
    if (editingIndex === targetIdx) {
      setEditingIndex(null);
      setEditFormData(null);
    }
  };

  const handleOpenEdit = (originalIndex: number) => {
    setEditingIndex(originalIndex);
    setEditFormData(JSON.parse(JSON.stringify(records[originalIndex])));
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex !== null && editFormData) {
      setRecords((prev) => {
        const copy = [...prev];
        const updated = { ...editFormData };
        const sched = { ...(updated.recurring_schedule || {}) };

        sched.amount_per_cycle = updated.amount;
        sched.completed_installments = updated.completed_installments;
        sched.total_installments = updated.installments_count;
        sched.total_amount = updated.total_amount;
        updated.recurring_schedule = sched as any;

        copy[editingIndex] = updated;
        return copy;
      });
      setEditingIndex(null);
      setEditFormData(null);
    }
  };

  // Recompute live currencies summary based on editable records
  const liveCurrencies = useMemo(() => {
    const stats: Record<string, { count: number; total_upcoming: number; total_principal: number }> = {};
    for (const r of records) {
      const curr = (r.currency || "USD").toUpperCase();
      if (!stats[curr]) {
        stats[curr] = { count: 0, total_upcoming: 0, total_principal: 0 };
      }
      stats[curr].count += 1;
      stats[curr].total_upcoming += Number(r.amount || 0);
      stats[curr].total_principal += Number(r.total_amount || 0);
    }
    return stats;
  }, [records]);

  const availableCurrencies = useMemo(() => {
    return Object.keys(liveCurrencies);
  }, [liveCurrencies]);

  const filteredRecordsWithOriginalIndex = useMemo(() => {
    return records
      .map((record, originalIndex) => ({ record, originalIndex }))
      .filter(({ record }) => {
        if (selectedCurrency !== "ALL") {
          if ((record.currency || "USD").toUpperCase() !== selectedCurrency.toUpperCase()) {
            return false;
          }
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchTitle = (record.title || "").toLowerCase().includes(q);
          const matchPayee = (record.payee || "").toLowerCase().includes(q);
          const matchDesc = (record.description || "").toLowerCase().includes(q);
          const matchCurr = (record.currency || "").toLowerCase().includes(q);
          return matchTitle || matchPayee || matchDesc || matchCurr;
        }
        return true;
      });
  }, [records, selectedCurrency, search]);

  const formatMoney = (val: number, currency: string = "USD") => {
    const symbolMap: Record<string, string> = {
      USD: "$",
      CAD: "CA$",
      GBP: "£",
      AUD: "A$",
      EUR: "€",
    };
    const sym = symbolMap[currency.toUpperCase()] || `${currency} `;
    return `${sym}${Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCurrencyBadgeClass = (curr: string) => {
    switch (curr?.toUpperCase()) {
      case "USD":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "CAD":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "GBP":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "AUD":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  if (!previewData) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !isSaving && onOpenChange(val)}>
        <DialogContent
          style={{ width: "96vw", maxWidth: "1600px" }}
          className="w-[96vw] max-w-[96vw] lg:max-w-[1550px] 2xl:max-w-[1680px] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-zinc-800 rounded-2xl"
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2.5">
                    Debt Schedule Import Preview
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {records.length} {records.length === 1 ? "Note" : "Notes"} Ready
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>Workbook: <strong>{fileName || "Debt Schedules.xlsm"}</strong></span>
                    <span>•</span>
                    <span>Review schedules below or click <strong>Edit</strong> on any row to adjust amounts, terms, or dates</span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="text-xs h-8 gap-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-300"
                  title="Revert all edits to original workbook values"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Original
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Notice Banner */}
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Preview Only:</strong> Records will only be inserted/updated when you click <strong>Save & Import</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] bg-white/80 dark:bg-zinc-800/90 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                <User className="w-3 h-3 text-slate-500" />
                Requester: <strong>{previewData.default_requester}</strong>
              </span>
              <span className="flex items-center gap-1 text-[11px] bg-white/80 dark:bg-zinc-800/90 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                <Building2 className="w-3 h-3 text-slate-500" />
                Dept: <strong>{previewData.default_department}</strong>
              </span>
              <span className="flex items-center gap-1 text-[11px] bg-white/80 dark:bg-zinc-800/90 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                <CreditCard className="w-3 h-3 text-slate-500" />
                Method: <strong>{previewData.default_payment_method}</strong>
              </span>
              <span className="flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Status: <strong>{previewData.default_review_status || "REVIEWED"}</strong>
              </span>
            </div>
          </div>

          {/* Currency Summary Chips & Search Filters */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-3">
            {/* Currency Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCurrency("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCurrency === "ALL"
                    ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                All ({records.length})
              </button>
              {availableCurrencies.map((curr) => {
                const stat = liveCurrencies[curr];
                const isSelected = selectedCurrency === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      curr === "USD" ? "bg-blue-500" :
                      curr === "CAD" ? "bg-emerald-500" :
                      curr === "GBP" ? "bg-amber-500" : "bg-purple-500"
                    }`} />
                    {curr} ({stat.count})
                    <span className="text-[10px] opacity-75 font-mono">
                      {formatMoney(stat.total_upcoming, curr)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search payees, notes, currencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Table Area */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] p-0 divide-y divide-slate-100 dark:divide-zinc-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-zinc-900/90 sticky top-0 z-10 text-[11px] uppercase tracking-wider text-slate-500 shadow-2xs">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="min-w-[280px]">Payee / Promissory Note</TableHead>
                  <TableHead className="w-24">Currency</TableHead>
                  <TableHead className="w-32">Next Due Date</TableHead>
                  <TableHead className="w-36 text-right">Next Payment</TableHead>
                  <TableHead className="w-44 text-center">Term Progress</TableHead>
                  <TableHead className="w-36 text-right">Total Principal</TableHead>
                  <TableHead className="w-44 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredRecordsWithOriginalIndex.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No promissory notes found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecordsWithOriginalIndex.map(({ record: rec, originalIndex }, idx) => {
                    const key = `rec-${originalIndex}`;
                    const isExpanded = !!expandedRows[key];
                    const installments = rec.recurring_schedule?.schedule_dates || [];
                    const progressPct = rec.installments_count > 0
                      ? Math.round((rec.completed_installments / rec.installments_count) * 100)
                      : 0;

                    return (
                      <React.Fragment key={key}>
                        <TableRow className={`hover:bg-slate-50/70 dark:hover:bg-zinc-900/60 transition-colors ${isExpanded ? "bg-slate-50/50 dark:bg-zinc-900/40" : ""}`}>
                          {/* Row Index */}
                          <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                            {idx + 1}
                          </TableCell>

                          {/* Title & Description */}
                          <TableCell className="py-3">
                            <div className="font-semibold text-slate-900 dark:text-zinc-100 text-xs leading-snug">
                              {rec.title}
                            </div>
                            {rec.description && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-md mt-0.5" title={rec.description}>
                                {rec.description}
                              </div>
                            )}
                          </TableCell>

                          {/* Currency Badge */}
                          <TableCell>
                            <Badge variant="outline" className={`text-[11px] font-semibold ${getCurrencyBadgeClass(rec.currency)}`}>
                              {rec.currency || "USD"}
                            </Badge>
                          </TableCell>

                          {/* Next Due Date */}
                          <TableCell className="font-mono text-slate-700 dark:text-zinc-300">
                            {rec.due_date || "—"}
                          </TableCell>

                          {/* Next Payment Amount */}
                          <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                            {formatMoney(rec.amount, rec.currency)}
                          </TableCell>

                          {/* Term Progress */}
                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                {rec.completed_installments} / {rec.installments_count} Paid
                              </span>
                              <div className="w-24 bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          {/* Total Principal */}
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {rec.total_amount > 0 ? formatMoney(rec.total_amount, rec.currency) : "—"}
                          </TableCell>

                          {/* Actions: Edit / View Cycles / Delete */}
                          <TableCell className="text-right pr-6">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(originalIndex)}
                                className="h-7 px-2 text-[11px] font-medium gap-1 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 dark:text-zinc-300"
                              >
                                <Pencil className="w-3 h-3 text-indigo-500" />
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRow(key)}
                                className="h-7 px-2 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="w-3.5 h-3.5 mr-1" />
                                    Cycles ({installments.length})
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRecord(originalIndex)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                title="Exclude this note from import"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable installment schedule drawer */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/90 dark:bg-zinc-900/80">
                            <TableCell colSpan={8} className="p-4">
                              <div className="bg-white dark:bg-zinc-950 rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800 shadow-inner">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                    Installment Schedule Ledger ({installments.length} Cycles)
                                  </span>
                                  <div className="flex items-center gap-3 text-[11px]">
                                    <span className="text-muted-foreground">
                                      Active Cycle: <strong>#{rec.completed_installments + 1}</strong>
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenEdit(originalIndex)}
                                      className="h-6 text-[10px] px-2 gap-1 text-indigo-600 border-indigo-200"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      Edit Cycles
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
                                  {installments.map((inst, i) => {
                                    const isPaid = i < rec.completed_installments;
                                    const isNext = i === rec.completed_installments;
                                    return (
                                      <div
                                        key={i}
                                        className={`p-2 rounded-lg border text-[11px] transition-all ${
                                          isNext
                                            ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700 ring-1 ring-emerald-400"
                                            : isPaid
                                            ? "bg-slate-100/70 border-slate-200 dark:bg-zinc-900/60 dark:border-zinc-800 text-muted-foreground"
                                            : "bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between font-semibold">
                                          <span>#{i + 1}</span>
                                          {isPaid ? (
                                            <span className="text-[10px] text-slate-400">Paid</span>
                                          ) : isNext ? (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-800 border-emerald-300">
                                              Next Due
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <div className="font-mono text-slate-800 dark:text-zinc-200 mt-0.5">
                                          {inst.date}
                                        </div>
                                        <div className="font-mono font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                                          {formatMoney(inst.amount || rec.amount, rec.currency)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Checkbox
                id="clear-existing-toggle"
                checked={clearExisting}
                onCheckedChange={(c) => setClearExisting(!!c)}
                disabled={isSaving}
              />
              <label
                htmlFor="clear-existing-toggle"
                className="font-medium text-slate-700 dark:text-zinc-300 cursor-pointer select-none"
              >
                Clear existing M&A debt schedules before saving (Recommended)
              </label>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSave(clearExisting, records)}
                disabled={isSaving || records.length === 0}
                className="text-xs h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving & Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Save & Import ({records.length} Records)
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sub-Modal: Dedicated Promissory Note Editor ── */}
      {editingIndex !== null && editFormData && (
        <Dialog open={editingIndex !== null} onOpenChange={(val) => !val && setEditingIndex(null)}>
          <DialogContent
            style={{ maxWidth: "720px" }}
            className="w-[94vw] max-w-[720px] max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Note — {editFormData.payee}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Modify title, currency, cycle amount, next due date, term progress, or individual installment dates.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditModal} className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">
                  Promissory Note Title / Payee <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value, payee: e.target.value })}
                  placeholder="e.g. KJM - Debt Schedule"
                  className="text-xs font-semibold h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Currency</label>
                  <select
                    value={editFormData.currency || "USD"}
                    onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-3 text-xs font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Next Due Date</label>
                  <Input
                    type="date"
                    value={editFormData.due_date || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">
                    Next Payment Cycle Amount ({editFormData.currency || "USD"})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">
                    Total Principal / Obligation ({editFormData.currency || "USD"})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.total_amount}
                    onChange={(e) => setEditFormData({ ...editFormData, total_amount: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Completed Installments (Paid)</label>
                  <Input
                    type="number"
                    min="0"
                    max={editFormData.installments_count}
                    value={editFormData.completed_installments}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        completed_installments: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-zinc-300">Total Term Installments</label>
                  <Input
                    type="number"
                    min="1"
                    value={editFormData.installments_count}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        installments_count: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-zinc-300">Description / Loan Terms</label>
                <textarea
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Terms, interest rate, notes..."
                />
              </div>

              {/* Installment Cycles Drawer inside Editor */}
              {editFormData.recurring_schedule?.schedule_dates && editFormData.recurring_schedule.schedule_dates.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Individual Installment Cycles ({editFormData.recurring_schedule.schedule_dates.length})
                    </label>
                    <span className="text-[11px] text-muted-foreground">Edit dates or amounts per installment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-zinc-900 rounded-lg border">
                    {editFormData.recurring_schedule.schedule_dates.map((inst, i) => (
                      <div key={i} className="p-2 rounded bg-white dark:bg-zinc-950 border space-y-1 text-xs">
                        <div className="flex items-center justify-between font-semibold text-[11px]">
                          <span>Cycle #{i + 1}</span>
                          {i < editFormData.completed_installments ? (
                            <span className="text-[10px] text-slate-400">Paid</span>
                          ) : i === editFormData.completed_installments ? (
                            <span className="text-[10px] text-emerald-600 font-bold">Next</span>
                          ) : null}
                        </div>
                        <Input
                          type="date"
                          value={inst.date}
                          onChange={(e) => {
                            const copyDates = [...(editFormData.recurring_schedule.schedule_dates || [])];
                            copyDates[i] = { ...copyDates[i], date: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              recurring_schedule: {
                                ...editFormData.recurring_schedule,
                                schedule_dates: copyDates,
                                custom_dates: copyDates.map((d) => d.date),
                              },
                            });
                          }}
                          className="h-6 text-[11px] font-mono px-1.5"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={inst.amount != null ? inst.amount : editFormData.amount}
                          onChange={(e) => {
                            const copyDates = [...(editFormData.recurring_schedule.schedule_dates || [])];
                            copyDates[i] = { ...copyDates[i], amount: parseFloat(e.target.value) || 0 };
                            setEditFormData({
                              ...editFormData,
                              recurring_schedule: {
                                ...editFormData.recurring_schedule,
                                schedule_dates: copyDates,
                              },
                            });
                          }}
                          className="h-6 text-[11px] font-mono font-bold px-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  Apply Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
