import React, { useMemo } from "react";
import type { PurchaseRequest, RecurringSchedule } from "@/types/purchasing";
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
import {
  formatRemainingDuration,
  generatePaymentSchedule,
  FREQUENCY_LABELS,
  type FrequencyType,
  type ProjectedInstallment,
} from "./recurringScheduleUtils";
import { CalendarClock, CheckCircle2, Clock, Calendar, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ScheduleBreakdownModalProps {
  request: PurchaseRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRequest?: (request: PurchaseRequest) => void;
}

export const ScheduleBreakdownModal: React.FC<ScheduleBreakdownModalProps> = ({
  request,
  open,
  onOpenChange,
  onEditRequest,
}) => {
  const navigate = useNavigate();

  const schedule: RecurringSchedule | null = useMemo(() => {
    if (!request) return null;
    return (
      request.recurring_schedule || {
        is_scheduled: false,
        frequency: "MONTHLY" as FrequencyType,
        start_date: request.due_date
          ? String(request.due_date).split("T")[0]
          : String(request.request_date).split("T")[0],
        end_date: null,
        total_installments: 24,
        completed_installments: 0,
        amount_per_cycle: request.amount || 0,
        total_amount: (request.amount || 0) * 24,
      }
    );
  }, [request]);

  const installments = useMemo(() => {
    if (!request || !schedule) return [];
    return generatePaymentSchedule(
      schedule,
      request.amount || 0,
      request.currency || "USD",
      request.status,
      request.due_date || request.request_date
    );
  }, [request, schedule]);

  if (!request || !schedule) return null;

  const formatMoney = (val?: number | null) => {
    if (val == null || isNaN(val)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: request.currency || "USD",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dStr: string) => {
    if (!dStr) return "-";
    const date = new Date(dStr.includes("T") ? dStr : dStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isCustom = schedule.frequency === "CUSTOM" || Boolean(schedule.schedule_dates?.length || schedule.custom_dates?.length);
  const durationInfo = isCustom
    ? { text: `${installments.length} Custom Milestone Dates`, isExpired: false, isNearEnd: false, totalDays: 0 }
    : formatRemainingDuration(schedule.end_date, schedule.start_date);
  const totalInstallments = schedule.total_installments || installments.length;
  const completedInstallments = Math.min(schedule.completed_installments || 0, totalInstallments);
  const cycleAmount =
    schedule.amount_per_cycle != null && schedule.amount_per_cycle > 0
      ? schedule.amount_per_cycle
      : request.amount || 0;
  const totalCommitment =
    schedule.total_amount ||
    installments.reduce((acc, it) => acc + (it.amount || 0), 0) ||
    cycleAmount * totalInstallments;
  const paidToDate = installments
    .filter((it) => it.status === "PAID")
    .reduce((acc, it) => acc + (it.amount || 0), 0);
  const remainingBalance = Math.max(0, totalCommitment - paidToDate);
  const progressPercent =
    totalInstallments > 0
      ? Math.min(100, Math.round((completedInstallments / totalInstallments) * 100))
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-[94vw] sm:max-w-5xl lg:max-w-[1250px] max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 pb-3 border-b bg-slate-50/70 dark:bg-zinc-900/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Recurring Schedule Breakdown: {request.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Request #{request.id} &bull; {request.department} &bull; Requester: {request.requester}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-xs font-semibold px-2.5 py-1"
            >
              {durationInfo.text}
            </Badge>
          </div>

          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-4 gap-2.5 pt-3">
            <div className="p-2.5 rounded-lg border bg-white dark:bg-zinc-900/80 shadow-2xs">
              <div className="text-[11px] font-medium text-muted-foreground">Frequency</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">
                {FREQUENCY_LABELS[(schedule.frequency as FrequencyType) || "MONTHLY"] || schedule.frequency}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatMoney(cycleAmount)} / cycle
              </div>
            </div>

            <div className="p-2.5 rounded-lg border bg-white dark:bg-zinc-900/80 shadow-2xs">
              <div className="text-[11px] font-medium text-muted-foreground">Progress</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">
                {completedInstallments} / {totalInstallments} Cycles
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg border bg-white dark:bg-zinc-900/80 shadow-2xs">
              <div className="text-[11px] font-medium text-muted-foreground">Paid to Date</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatMoney(paidToDate)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {completedInstallments} installments settled
              </div>
            </div>

            <div className="p-2.5 rounded-lg border bg-white dark:bg-zinc-900/80 shadow-2xs">
              <div className="text-[11px] font-medium text-muted-foreground">Total Commitment</div>
              <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                {formatMoney(totalCommitment)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatMoney(remainingBalance)} remaining
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto p-4 max-h-[50vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 border-b z-10">
              <tr>
                <th className="py-2 px-3 text-left font-semibold w-16">#</th>
                <th className="py-2 px-3 text-left font-semibold">Scheduled Due Date</th>
                <th className="py-2 px-3 text-right font-semibold">Installment Amount</th>
                <th className="py-2 px-3 text-right font-semibold">Cumulative Total</th>
                <th className="py-2 px-3 text-center font-semibold w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {installments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No installment schedule generated.
                  </td>
                </tr>
              ) : (
                installments.map((inst: ProjectedInstallment) => {
                  return (
                    <tr
                      key={inst.installmentNumber}
                      className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors ${
                        inst.status === "CURRENT"
                          ? "bg-amber-50/40 dark:bg-amber-950/20 font-medium"
                          : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-zinc-400">
                        #{inst.installmentNumber}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(inst.dueDate)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-zinc-100">
                        {formatMoney(inst.amount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-zinc-400">
                        {formatMoney(inst.cumulativeAmount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {inst.status === "PAID" ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] py-0 px-2 leading-tight inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                          </Badge>
                        ) : inst.status === "CURRENT" ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[10px] py-0 px-2 leading-tight inline-flex items-center gap-1 font-bold"
                          >
                            <Clock className="h-2.5 w-2.5" /> Current Due
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-zinc-400 text-[10px] py-0 px-2 leading-tight"
                          >
                            Projected
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Schedule: {formatDate(schedule.start_date || "")} - {formatDate(schedule.end_date || "")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                if (onEditRequest && request) {
                  onEditRequest(request);
                } else if (request) {
                  navigate(`/purchasing/requests/${request.id}`);
                }
              }}
              className="gap-1 text-xs"
            >
              Open Request Details
              <ArrowUpRight className="h-3 w-3" />
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
