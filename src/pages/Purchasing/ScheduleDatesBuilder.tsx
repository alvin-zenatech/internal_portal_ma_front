import React from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  ArrowUpDown,
  Calculator,
  Clock,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FrequencyType, CustomScheduleDate } from "@/types/purchasing";
import {
  formatDateToIso,
  calculateInstallmentsCount,
  formatRemainingDuration,
} from "@/pages/Purchasing/recurringScheduleUtils";

export interface ScheduleDatesBuilderProps {
  isScheduled: boolean;
  onIsScheduledChange: (val: boolean) => void;
  frequency: FrequencyType;
  onFrequencyChange: (val: FrequencyType) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  scheduleDates: CustomScheduleDate[];
  onScheduleDatesChange: (dates: CustomScheduleDate[]) => void;
  baseAmount?: number;
  currency?: string;
}

export const ScheduleDatesBuilder: React.FC<ScheduleDatesBuilderProps> = ({
  isScheduled,
  onIsScheduledChange,
  frequency,
  onFrequencyChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  scheduleDates,
  onScheduleDatesChange,
  baseAmount = 0,
  currency = "USD",
}) => {
  const isCustom = frequency === "CUSTOM";

  // Helper to add a new custom installment date
  const handleAddDate = (offsetDays: number = 30) => {
    let nextDateStr = new Date().toISOString().split("T")[0];

    if (scheduleDates.length > 0) {
      const lastDate = scheduleDates[scheduleDates.length - 1].date;
      if (lastDate) {
        const d = new Date(lastDate.includes("T") ? lastDate : lastDate + "T00:00:00");
        d.setDate(d.getDate() + offsetDays);
        nextDateStr = formatDateToIso(d);
      }
    } else if (startDate) {
      const d = new Date(startDate.includes("T") ? startDate : startDate + "T00:00:00");
      d.setDate(d.getDate() + offsetDays);
      nextDateStr = formatDateToIso(d);
    }

    const lastAmount = scheduleDates.length > 0 ? scheduleDates[scheduleDates.length - 1].amount : undefined;
    const defaultItemAmt = (lastAmount != null && lastAmount > 0) ? lastAmount : (baseAmount > 0 ? baseAmount : undefined);

    const newDates = [
      ...scheduleDates,
      {
        date: nextDateStr,
        amount: defaultItemAmt,
        note: `Installment #${scheduleDates.length + 1}`,
      },
    ];

    onScheduleDatesChange(newDates);

    // Sync start and end date
    if (newDates.length > 0) {
      const sorted = [...newDates].sort((a, b) => a.date.localeCompare(b.date));
      onStartDateChange(sorted[0].date);
      onEndDateChange(sorted[sorted.length - 1].date);
    }
  };

  const handleUpdateDate = (index: number, field: keyof CustomScheduleDate, value: any) => {
    const updated = [...scheduleDates];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onScheduleDatesChange(updated);

    if (field === "date" && updated.length > 0) {
      const validDates = updated.map((d) => d.date).filter(Boolean);
      if (validDates.length > 0) {
        validDates.sort();
        onStartDateChange(validDates[0]);
        onEndDateChange(validDates[validDates.length - 1]);
      }
    }
  };

  const handleRemoveDate = (index: number) => {
    const updated = scheduleDates.filter((_, i) => i !== index);
    onScheduleDatesChange(updated);
    if (updated.length > 0) {
      const validDates = updated.map((d) => d.date).filter(Boolean);
      if (validDates.length > 0) {
        validDates.sort();
        onStartDateChange(validDates[0]);
        onEndDateChange(validDates[validDates.length - 1]);
      }
    }
  };

  const handleSortDates = () => {
    const sorted = [...scheduleDates].sort((a, b) => a.date.localeCompare(b.date));
    onScheduleDatesChange(sorted);
    if (sorted.length > 0) {
      onStartDateChange(sorted[0].date);
      onEndDateChange(sorted[sorted.length - 1].date);
    }
  };

  const handleDistributeEvenly = () => {
    if (scheduleDates.length === 0 || baseAmount <= 0) return;
    const splitAmount = Math.round((baseAmount / scheduleDates.length) * 100) / 100;
    const updated = scheduleDates.map((item) => ({
      ...item,
      amount: splitAmount,
    }));
    onScheduleDatesChange(updated);
  };

  const totalCustomAmount = scheduleDates.reduce((acc, item) => {
    const amt = item.amount != null && item.amount > 0 ? item.amount : baseAmount;
    return acc + amt;
  }, 0);

  const formatMoney = (amt: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amt || 0);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/50 p-4 sm:p-5 space-y-4 flex flex-col h-full">
      {/* Header Toggle */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <div className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Schedule & Installment Dates</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Plan recurring payments or milestones with specific dates and custom amounts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <Checkbox
            id="builder-sched-check"
            checked={isScheduled}
            onCheckedChange={(checked) => {
              const isChecked = Boolean(checked);
              onIsScheduledChange(isChecked);
              if (isChecked) {
                onFrequencyChange("CUSTOM");
                const sDate = startDate || new Date().toISOString().split("T")[0];
                if (scheduleDates.length === 0) {
                  const nextMonth = new Date(sDate + "T00:00:00");
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  const d2 = formatDateToIso(nextMonth);
                  onScheduleDatesChange([
                    { date: sDate, amount: baseAmount > 0 ? baseAmount : undefined, note: "Installment #1" },
                    { date: d2, amount: baseAmount > 0 ? baseAmount : undefined, note: "Installment #2" },
                  ]);
                  onStartDateChange(sDate);
                  onEndDateChange(d2);
                } else if (!startDate) {
                  const d = new Date(sDate + "T00:00:00");
                  d.setFullYear(d.getFullYear() + 2);
                  onStartDateChange(sDate);
                  onEndDateChange(formatDateToIso(d));
                }
              }
            }}
          />
          <label
            htmlFor="builder-sched-check"
            className="text-xs font-semibold cursor-pointer text-slate-700 dark:text-zinc-300 select-none"
          >
            Enable Schedule
          </label>
        </div>
      </div>

      {isScheduled && (
        <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-zinc-800 flex-1 flex flex-col">
          {/* Frequency & Schedule Type */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Schedule Mode
              </label>
              {isCustom ? (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 font-semibold">
                  <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
                  Schedule & Installment Dates
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-slate-300 text-slate-600 dark:text-zinc-400">
                  Periodic
                </Badge>
              )}
            </div>

            <Select
              value={frequency}
              onValueChange={(v: FrequencyType) => {
                onFrequencyChange(v);
                if (v === "CUSTOM" && scheduleDates.length === 0) {
                  const d1 = startDate || new Date().toISOString().split("T")[0];
                  const nextMonth = new Date(d1 + "T00:00:00");
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  const d2 = formatDateToIso(nextMonth);
                  onScheduleDatesChange([
                    { date: d1, amount: baseAmount > 0 ? baseAmount : undefined, note: "Installment #1" },
                    { date: d2, amount: baseAmount > 0 ? baseAmount : undefined, note: "Installment #2" },
                  ]);
                  onStartDateChange(d1);
                  onEndDateChange(d2);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs font-medium bg-white dark:bg-zinc-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOM" className="font-semibold text-indigo-600 dark:text-indigo-400">
                  ✨ Schedule & Installment Dates (Custom List)
                </SelectItem>
                <SelectItem value="MONTHLY">Monthly (Periodic)</SelectItem>
                <SelectItem value="BI_WEEKLY">Bi-Weekly (Every 2 Weeks)</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly (3 Months)</SelectItem>
                <SelectItem value="SEMI_ANNUALLY">Semi-Annually (6 Months)</SelectItem>
                <SelectItem value="ANNUALLY">Annually (1 Year)</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Periodic Start & End Date */}
          {!isCustom && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Start Date</label>
                <Input
                  type="date"
                  className="h-9 text-xs bg-white dark:bg-zinc-950"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">End Date</label>
                <Input
                  type="date"
                  className="h-9 text-xs bg-white dark:bg-zinc-950"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── CUSTOM INSTALLMENT DATES LIST ── */}
          {isCustom && (
            <div className="space-y-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800 flex-1 flex flex-col">
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                  <span>
                    <strong className="text-slate-900 dark:text-zinc-100">{scheduleDates.length}</strong> dates · Total: <strong className="text-slate-900 dark:text-zinc-100">{formatMoney(totalCustomAmount)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 px-2.5 bg-white dark:bg-zinc-950"
                    onClick={handleSortDates}
                    title="Sort dates chronologically"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    Sort
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 px-2.5 bg-white dark:bg-zinc-950"
                    onClick={handleDistributeEvenly}
                    title="Split total amount evenly"
                  >
                    <Calculator className="h-3 w-3" />
                    Split
                  </Button>
                </div>
              </div>

              {/* Column Labels */}
              <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-4">Due Date</div>
                <div className="col-span-3 text-right">Amount</div>
                <div className="col-span-3">Note</div>
                <div className="col-span-1"></div>
              </div>

              {/* Installment Rows with comfortable scroll height */}
              <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1 flex-1">
                {scheduleDates.length === 0 ? (
                  <div className="p-5 text-center rounded-lg border border-dashed text-xs text-muted-foreground bg-white dark:bg-zinc-950">
                    No installment dates added yet. Click <strong>+ Add Installment Date</strong> below.
                  </div>
                ) : (
                  scheduleDates.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-700 transition-colors"
                    >
                      {/* Index Badge */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="h-6 w-6 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Date picker */}
                      <div className="col-span-4">
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleUpdateDate(idx, "date", e.target.value)}
                          className="h-8 text-xs font-medium px-2 w-full bg-slate-50/50 dark:bg-zinc-900/50"
                          required
                        />
                      </div>

                      {/* Custom Amount */}
                      <div className="col-span-3 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={baseAmount ? baseAmount.toFixed(2) : "0.00"}
                          value={item.amount != null ? item.amount : ""}
                          onChange={(e) =>
                            handleUpdateDate(
                              idx,
                              "amount",
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="h-8 text-xs pl-5 pr-1 font-medium text-right w-full bg-slate-50/50 dark:bg-zinc-900/50 font-mono"
                        />
                      </div>

                      {/* Optional Note / Label */}
                      <div className="col-span-3">
                        <Input
                          placeholder="Note"
                          value={item.note || ""}
                          onChange={(e) => handleUpdateDate(idx, "note", e.target.value)}
                          className="h-8 text-xs px-2 w-full bg-slate-50/50 dark:bg-zinc-900/50"
                        />
                      </div>

                      {/* Delete button */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={() => handleRemoveDate(idx)}
                          title="Remove date"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action buttons & quick add helpers */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => handleAddDate(30)}
                    size="sm"
                    className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs text-xs font-semibold px-3"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Date
                  </Button>

                  {/* Quick Add Interval helpers */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground text-xs mr-0.5">Quick:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2 bg-white dark:bg-zinc-950"
                      onClick={() => handleAddDate(7)}
                    >
                      +1 Wk
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2 bg-white dark:bg-zinc-950"
                      onClick={() => handleAddDate(14)}
                    >
                      +2 Wks
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2 bg-white dark:bg-zinc-950"
                      onClick={() => handleAddDate(30)}
                    >
                      +1 Mo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2 bg-white dark:bg-zinc-950"
                      onClick={() => handleAddDate(90)}
                    >
                      +3 Mos
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Periodic summary info banner */}
          {!isCustom && startDate && endDate && (
            <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200 mt-auto">
              <span className="font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                {formatRemainingDuration(endDate, startDate).text}
              </span>
              <span>
                <strong>{calculateInstallmentsCount(startDate, endDate, frequency)}</strong> cycles ·{" "}
                <strong className="text-indigo-700 dark:text-indigo-300">{formatMoney(calculateInstallmentsCount(startDate, endDate, frequency) * (baseAmount || 0))}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleDatesBuilder;
