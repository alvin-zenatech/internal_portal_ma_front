import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ArrowLeft,
  ArrowRight,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Receipt,
  Paperclip,
  History,
  ShieldCheck,
  Plus,
  RefreshCw,
  Check,
  AlertTriangle,
  X,
  UploadCloud,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useRequestDetail, useTransitionRequest, useUploadAttachments, useGLCodes } from "@/hooks/usePurchasing";
import { BankAccountAutocomplete } from "./BankAccountAutocomplete";
import { CategoryAutocomplete } from "./CategoryAutocomplete";
import { renderBankAccountBadge, renderCategoryBadge } from "@/utils/glAccountUtils";
import {
  RequestStatus,
  type RequestDetail,
  type CustomScheduleDate,
  type FrequencyType,
} from "@/types/purchasing";
import { parseRequestStatus } from "@/lib/requestStatus";
import {
  formatDate,
  formatMoney,
  getStatusBadge,
  getStatusLabel,
} from "./purchasingMeta";
import {
  formatRemainingDuration,
  calculateInstallmentsCount,
  generatePaymentSchedule,
  formatDateToIso,
  FREQUENCY_LABELS,
  type ProjectedInstallment,
} from "./recurringScheduleUtils";
import { ScheduleDatesBuilder } from "./ScheduleDatesBuilder";
import { ScheduleBreakdownModal } from "./ScheduleBreakdownModal";
import { Button } from "@/components/ui/button";
import HelpIcon from "@/components/ui/HelpIcon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function PurchaseRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: requestDetail, isLoading, error, refetch } = useRequestDetail(id);
  const { data: glCodes = [] } = useGLCodes();

  const request = requestDetail?.request;
  const invoice = requestDetail?.invoice;
  const approvals = requestDetail?.approvals || [];
  const attachments = requestDetail?.attachments || [];
  const history = requestDetail?.history || [];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isScheduleLedgerOpen, setIsScheduleLedgerOpen] = useState(false);
  const [isRecordInvoiceOpen, setIsRecordInvoiceOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<ProjectedInstallment | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    requester: "",
    department: "",
    amount: "",
    due_date: "",
    description: "",
    gl_code: "",
    bank_account: "",
    priority: "MEDIUM",
    is_scheduled: true,
    frequency: "CUSTOM" as FrequencyType,
    start_date: "",
    end_date: "",
    completed_installments: 0,
    schedule_dates: [] as CustomScheduleDate[],
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    vendor: "",
    amount: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    bank_account: "",
    gl_code: "",
    department: "M&A",
    from_location: "USA",
    asset_flag: false,
    description: "",
  });

  useEffect(() => {
    if (request) {
      document.dispatchEvent(
        new CustomEvent("set-breadcrumb-trail", {
          detail: {
            path: window.location.pathname,
            items: [
              { title: "Purchasing", path: "/purchasing/recurring" },
              { title: "Recurring Payments", path: "/purchasing/recurring" },
              { title: `${request.title} (#${request.id})` },
            ],
          },
        })
      );
    }
  }, [request]);

  const handleOpenEdit = () => {
    if (!request) return;
    const sched = request.recurring_schedule;
    const isSched = sched?.is_scheduled !== undefined ? Boolean(sched.is_scheduled) : true;
    let schedDates: CustomScheduleDate[] = [];
    if (sched?.schedule_dates && sched.schedule_dates.length > 0) {
      schedDates = sched.schedule_dates;
    } else if (sched?.custom_dates && sched.custom_dates.length > 0) {
      schedDates = sched.custom_dates.map((d: string, i: number) => ({
        date: d,
        amount: sched?.amount_per_cycle || request.amount,
        note: `Installment #${i + 1}`,
      }));
    } else if (isSched) {
      const baseDate = sched?.start_date ? sched.start_date.split("T")[0] : (request.due_date ? request.due_date.split("T")[0] : new Date().toISOString().split("T")[0]);
      const nextMonth = new Date(baseDate + "T00:00:00");
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthIso = formatDateToIso(nextMonth);
      schedDates = [
        { date: baseDate, amount: request.amount || undefined, note: "Installment #1" },
        { date: nextMonthIso, amount: request.amount || undefined, note: "Installment #2" },
      ];
    }

    setEditForm({
      title: request.title || "",
      requester: request.requester || "",
      department: request.department || "",
      amount: request.amount ? request.amount.toString() : "",
      due_date: request.due_date ? request.due_date.split("T")[0] : "",
      description: request.description || "",
      gl_code: request.gl_code || "",
      bank_account: (request as any)?.bank_account || invoice?.bank_account || "",
      priority: request.priority || "MEDIUM",
      is_scheduled: isSched,
      frequency: (sched?.frequency as FrequencyType) || "CUSTOM",
      start_date: sched?.start_date ? sched.start_date.split("T")[0] : (schedDates[0]?.date || (request.due_date ? request.due_date.split("T")[0] : "")),
      end_date: sched?.end_date ? sched.end_date.split("T")[0] : (schedDates[schedDates.length - 1]?.date || ""),
      completed_installments: sched?.completed_installments || 0,
      schedule_dates: schedDates,
    });
    setIsEditOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!id) throw new Error("No ID");
      return await apiClient.put<RequestDetail>(`/api/purchasing/requests/${id}`, payload);
    },
    onSuccess: (res) => {
      toast.success(`Request #${res.request.id} updated successfully`);
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchasing", "request", id] });
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update request");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!id) throw new Error("No ID");
      return await apiClient.patch<RequestDetail>(`/api/purchasing/requests/${id}/review-status`, {
        review_status: newStatus,
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Marked as ${res.request.review_status === "REVIEWED" ? "Reviewed" : "Waiting for Review"}`
      );
      queryClient.invalidateQueries({ queryKey: ["purchasing", "request", id] });
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update review status");
    },
  });

  const recordInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!id) throw new Error("No ID");
      return await apiClient.post<RequestDetail>(`/api/purchasing/requests/${id}/invoices`, payload);
    },
    onSuccess: () => {
      toast.success(
        selectedInstallment
          ? `Payment recorded successfully for Installment #${selectedInstallment.installmentNumber}`
          : "Invoice recorded successfully"
      );
      setIsRecordInvoiceOpen(false);
      setSelectedInstallment(null);
      queryClient.invalidateQueries({ queryKey: ["purchasing", "request", id] });
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record invoice");
    },
  });

  const transitionMutation = useTransitionRequest(id || "");
  const uploadMutation = useUploadAttachments(id || "");

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const isCustom = editForm.frequency === "CUSTOM";
    const customDates = isCustom ? editForm.schedule_dates : [];
    const isSched = Boolean(
      editForm.is_scheduled &&
      (isCustom ? customDates.length > 0 : editForm.start_date && editForm.end_date)
    );

    const customSum = isCustom ? customDates.reduce((acc, itm) => acc + (itm.amount != null ? itm.amount : 0), 0) : 0;
    let baseAmt = parseFloat(editForm.amount) || 0;

    if (isSched && isCustom) {
      if (customDates.length === 0) {
        toast.error("Please add at least one installment date");
        return;
      }
      if (customSum <= 0 && baseAmt <= 0) {
        toast.error("Please enter an amount for the installment dates (greater than $0.00)");
        return;
      }
    } else {
      if (baseAmt <= 0) {
        toast.error("Please enter a valid amount greater than $0.00");
        return;
      }
    }

    let totalCycles: number | null = null;
    let totalAmt: number | null = null;
    let amt = baseAmt;

    if (isSched) {
      if (isCustom) {
        totalCycles = customDates.length;
        totalAmt = customSum > 0 ? customSum : (baseAmt > 0 ? baseAmt * totalCycles : 0);
        const completedCount = editForm.completed_installments || 0;
        const activeCycleDate = customDates[completedCount] || customDates[0];
        const cycleAmt = activeCycleDate?.amount != null && activeCycleDate.amount > 0
          ? activeCycleDate.amount
          : (baseAmt > 0 ? baseAmt : (totalCycles > 0 ? Math.round((totalAmt / totalCycles) * 100) / 100 : 0));
        const sanitizedDates = customDates.map((d, i) => ({
          date: d.date,
          amount: d.amount != null && d.amount > 0 ? d.amount : cycleAmt,
          note: d.note || `Installment #${i + 1}`,
        }));

        const effectiveStartDate = sanitizedDates.length > 0 ? sanitizedDates[0].date : editForm.start_date;
        const effectiveEndDate = sanitizedDates.length > 0 ? sanitizedDates[sanitizedDates.length - 1].date : editForm.end_date;
        const effectiveDueDate = effectiveStartDate || editForm.due_date;

        updateMutation.mutate({
          title: editForm.title,
          requester: editForm.requester,
          department: editForm.department,
          request_type: (isSched || request?.request_type === "SCHEDULED_PAYMENT") ? "SCHEDULED_PAYMENT" : (request?.request_type || "RECURRING"),
          priority: editForm.priority,
          amount: cycleAmt,
          unit_price: cycleAmt,
          quantity: 1,
          description: editForm.description,
          gl_code: request?.gl_code || editForm.gl_code || null,
          due_date: effectiveDueDate || null,
          recurring_schedule: {
            is_scheduled: true,
            frequency: editForm.frequency,
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            total_installments: totalCycles,
            completed_installments: editForm.completed_installments || 0,
            amount_per_cycle: cycleAmt,
            total_amount: totalAmt,
            custom_dates: sanitizedDates.map((d) => d.date),
            schedule_dates: sanitizedDates,
          },
        });
        return;
      } else {
        totalCycles = calculateInstallmentsCount(editForm.start_date, editForm.end_date, editForm.frequency);
        totalAmt = totalCycles ? Math.round(amt * totalCycles * 100) / 100 : null;
      }
    }

    const effectiveStartDate = isCustom && customDates.length > 0 ? customDates[0].date : editForm.start_date;
    const effectiveEndDate = isCustom && customDates.length > 0 ? customDates[customDates.length - 1].date : editForm.end_date;
    const effectiveDueDate = (isSched && effectiveStartDate) ? effectiveStartDate : editForm.due_date;

    updateMutation.mutate({
      title: editForm.title,
      requester: editForm.requester,
      department: editForm.department,
      request_type: (isSched || request?.request_type === "SCHEDULED_PAYMENT") ? "SCHEDULED_PAYMENT" : (request?.request_type || "RECURRING"),
      priority: editForm.priority,
      amount: amt,
      unit_price: amt,
      quantity: 1,
      description: editForm.description,
      gl_code: editForm.gl_code || request?.gl_code || null,
      bank_account: editForm.bank_account || (request as any)?.bank_account || null,
      due_date: effectiveDueDate || null,
      recurring_schedule: isSched
        ? {
            is_scheduled: true,
            frequency: editForm.frequency,
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            total_installments: totalCycles,
            completed_installments: editForm.completed_installments || 0,
            amount_per_cycle: totalCycles && totalCycles > 0 ? Math.round((totalAmt! / totalCycles) * 100) / 100 : amt,
            total_amount: totalAmt,
            custom_dates: isCustom ? customDates.map((d) => d.date) : null,
            schedule_dates: isCustom ? customDates : null,
          }
        : {
            is_scheduled: false,
            frequency: editForm.frequency || "MONTHLY",
            start_date: editForm.start_date || editForm.due_date || new Date().toISOString().split("T")[0],
            end_date: null,
            total_installments: null,
            completed_installments: editForm.completed_installments || 0,
            amount_per_cycle: amt,
            total_amount: null,
          },
    });
  };

  const handleRecordInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(invoiceForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!invoiceForm.bank_account?.trim()) {
      toast.error("Bank Account is required");
      return;
    }
    if (!invoiceForm.gl_code?.trim()) {
      toast.error("Category (GL Code) is required");
      return;
    }
    recordInvoiceMutation.mutate(
      {
        vendor: invoiceForm.vendor || request?.title || "",
        amount: amt,
        invoice_date: invoiceForm.invoice_date,
        due_date: invoiceForm.due_date || null,
        bank_account: invoiceForm.bank_account.trim(),
        gl_code: invoiceForm.gl_code.trim(),
        department: invoiceForm.department || request?.department || "M&A",
        from_location: invoiceForm.from_location || "USA",
        asset_flag: invoiceForm.asset_flag,
        description: invoiceForm.description || null,
      },
      {
        onSuccess: () => {
          if (invoiceFiles.length > 0) {
            uploadMutation.mutate(invoiceFiles, {
              onSuccess: () => {
                setInvoiceFiles([]);
              },
            });
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading recurring request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Request Not Found</h2>
        <p className="text-sm text-slate-500">
          The request #{id} could not be located or you don't have permission to access it.
        </p>
        <Button onClick={() => navigate("/purchasing/recurring")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Recurring Payments
        </Button>
      </div>
    );
  }

  const sched = request.recurring_schedule || {
    is_scheduled: false,
    frequency: "MONTHLY" as FrequencyType,
    start_date: request.due_date ? String(request.due_date).split("T")[0] : String(request.request_date).split("T")[0],
    end_date: null,
    total_installments: null,
    completed_installments: 0,
    amount_per_cycle: request.amount || 0,
    total_amount: null,
  };

  const isReviewed = request.review_status === "REVIEWED";
  const parsedStatus = parseRequestStatus(request.status);
  const effectiveCompletedInstallments = Math.max(
    sched.completed_installments || 0,
    invoice ? 1 : 0
  );

  const completedCount = sched.completed_installments || 0;
  const isCustomMilestones = sched.frequency === "CUSTOM" || Boolean(sched.schedule_dates?.length);
  const activeMilestoneIndex = sched.schedule_dates && sched.schedule_dates.length > 0
    ? (completedCount < sched.schedule_dates.length ? completedCount : sched.schedule_dates.length - 1)
    : 0;
  const currentMilestoneDate = sched.schedule_dates?.[activeMilestoneIndex];
  const currentCycleAmount = isCustomMilestones && currentMilestoneDate?.amount != null && Number(currentMilestoneDate.amount) > 0
    ? Number(currentMilestoneDate.amount)
    : (sched.amount_per_cycle != null && Number(sched.amount_per_cycle) > 0
        ? Number(sched.amount_per_cycle)
        : (request.amount || 0));

  const durationInfo = formatRemainingDuration(sched.end_date, sched.start_date);
  const isOngoing = !sched.total_installments && !sched.end_date;
  const totalCommitment = sched.total_amount != null 
    ? sched.total_amount 
    : (sched.schedule_dates && sched.schedule_dates.length > 0
        ? sched.schedule_dates.reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0)
        : (sched.total_installments ? sched.total_installments * currentCycleAmount : null));
  const paidToDate = (sched.schedule_dates && sched.schedule_dates.length > 0)
    ? sched.schedule_dates.slice(0, effectiveCompletedInstallments).reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0)
    : effectiveCompletedInstallments * currentCycleAmount;

  const currentCycle = effectiveCompletedInstallments + 1;
  const totalCycles = sched.total_installments;
  const allCyclesCompleted = Boolean(
    totalCycles && effectiveCompletedInstallments >= totalCycles
  );
  const cycleBracket = parsedStatus === RequestStatus.Completed
    ? (totalCycles ? ` (${totalCycles}/${totalCycles} Cycles)` : "")
    : (totalCycles ? ` (Cycle ${Math.min(currentCycle, totalCycles)}/${totalCycles})` : ` (Cycle ${currentCycle})`);

  // Generate the full payment installments schedule
  const allInstallments: ProjectedInstallment[] = generatePaymentSchedule(
    { ...sched, completed_installments: effectiveCompletedInstallments },
    request.amount,
    request.currency || "USD",
    request.status,
    request.due_date || request.request_date
  );

  const handleOpenRecordPayment = (inst?: ProjectedInstallment) => {
    setSelectedInstallment(inst || null);
    const instAmt = inst?.amount != null && inst.amount > 0 ? inst.amount : (request?.amount || 0);
    const instDate = inst?.dueDate || (request?.due_date ? String(request.due_date).split("T")[0] : new Date().toISOString().split("T")[0]);
    const instNum = inst?.installmentNumber || currentCycle;

    setInvoiceForm({
      vendor: request?.title || "",
      amount: instAmt.toString(),
      invoice_date: instDate,
      due_date: instDate,
      bank_account: (request as any)?.bank_account || invoice?.bank_account || "",
      gl_code: request?.gl_code || invoice?.gl_code || "",
      department: request?.department || "M&A",
      from_location: (request as any)?.from_location || "USA",
      asset_flag: Boolean(request?.request_type === "SCHEDULED_PAYMENT" || request?.request_type === "RECURRING" || invoice?.asset_flag),
      description: `Payment for Installment #${instNum} (${formatDate(instDate)}) - ${request?.title || ""}`,
    });
    setInvoiceFiles([]);
    setIsRecordInvoiceOpen(true);
  };

  // Workflow steps for Recurring Requests
  const workflowSteps = [
    { key: RequestStatus.UnderReview, label: "Under Review" },
    { key: RequestStatus.WaitingPayment, label: `Waiting Payment ${cycleBracket}` },
    { key: RequestStatus.InvoiceReceived, label: `Invoice Received ${cycleBracket}` },
    { key: RequestStatus.Completed, label: "Completed" },
  ];

  const currentStepIndex = workflowSteps.findIndex((s) => s.key === parsedStatus);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Top Navigation Action Bar ── */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/purchasing/recurring")}
          className="text-xs gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Recurring
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenEdit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-xs"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Request
          </Button>
        </div>
      </div>

      {/* ── Main Request Header Banner ── */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-bold font-mono text-slate-400 dark:text-zinc-500">
                #{request.id}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
                {request.title}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 font-semibold ${getStatusBadge(request.status)}`}
              >
                {getStatusLabel(request.status)}{cycleBracket}
              </Badge>

              {/* Review status badge with inline toggle action */}
              <button
                type="button"
                onClick={() => reviewMutation.mutate(isReviewed ? "WAITING_FOR_REVIEW" : "REVIEWED")}
                disabled={reviewMutation.isPending}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  isReviewed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100"
                }`}
                title="Click to toggle review status"
              >
                {isReviewed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Reviewed
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Waiting for Review
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline ml-0.5">
                      Click to Review ➔
                    </span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
              <span>· Recurring</span>
              <span>· Requested by <strong className="text-slate-800 dark:text-zinc-200">{request.requester}</strong> ({request.department})</span>
              <span>· {formatDate(request.request_date || request.created_at)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScheduleLedgerOpen(true)}
              className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-300"
            >
              <CalendarClock className="h-4 w-4 text-indigo-600" />
              View Ledger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs p-2 h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* ── Workflow Action Bar / Stepper ── */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Workflow Status
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              {isReviewed ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Request Reviewed & Verified
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Action Required: Click 'Mark as Reviewed' to unlock invoice records & settlement
                </span>
              )}
            </span>
          </div>

          {/* Stepper Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {workflowSteps.map((step, idx) => {
              const isCompleted = currentStepIndex > idx || parsedStatus === RequestStatus.Completed;
              const isCurrent = currentStepIndex === idx;

              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
                    isCurrent
                      ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-bold shadow-2xs"
                      : isCompleted
                      ? "bg-slate-50 border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                      : "bg-white dark:bg-zinc-950 border-dashed border-slate-200 dark:border-zinc-800 text-slate-400"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-zinc-800 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                  </div>
                  <span className="truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Action Prompt Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Action Required:</span>
              {!isReviewed ? (
                <span>Review pending. Click <strong>'Mark as Reviewed'</strong> to enable invoice records and milestone settlements.</span>
              ) : parsedStatus === RequestStatus.InvoiceReceived ? (
                <span>
                  Cycle {Math.min(currentCycle, totalCycles || currentCycle)} invoice received. Confirm settlement to return to <strong>Waiting Payment (Cycle {Math.min(currentCycle + 1, totalCycles || currentCycle + 1)})</strong>.
                </span>
              ) : parsedStatus === RequestStatus.WaitingPayment ? (
                <span>
                  Waiting for Cycle {Math.min(currentCycle, totalCycles || currentCycle)} payment {request.due_date ? `(Due: ${formatDate(request.due_date)})` : ""}. Record invoice from the schedule breakdown below when received.
                </span>
              ) : parsedStatus === RequestStatus.Completed ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  All recurring installment cycles have been completed.
                </span>
              ) : (
                <span>Request is verified. Manage upcoming cycle milestones from the schedule breakdown below.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isReviewed ? (
                <Button
                  size="sm"
                  onClick={() => reviewMutation.mutate("REVIEWED")}
                  disabled={reviewMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 h-8 font-semibold shadow-2xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark as Reviewed
                </Button>
              ) : (
                <>
                  {parsedStatus === RequestStatus.InvoiceReceived && (
                    <Button
                      size="sm"
                      onClick={() =>
                        transitionMutation.mutate({
                          action: "COMPLETE",
                          comment: `Settled cycle ${currentCycle} payment and advanced recurring cycle`,
                        })
                      }
                      disabled={transitionMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 h-8 font-semibold shadow-2xs"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      {allCyclesCompleted || (totalCycles && currentCycle >= totalCycles)
                        ? "Confirm Settlement & Mark Completed"
                        : `Confirm Payment & Advance to Cycle ${currentCycle + 1}`}
                    </Button>
                  )}
                  {allCyclesCompleted && parsedStatus !== RequestStatus.Completed && parsedStatus !== RequestStatus.InvoiceReceived && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        transitionMutation.mutate({
                          action: "COMPLETE",
                          comment: "Completed recurring billing item",
                        })
                      }
                      disabled={transitionMutation.isPending}
                      className="text-xs h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Mark Completed
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ALL PAYMENTS & ACTION SCHEDULE ── */}
      <Card className="shadow-xs border-indigo-100 dark:border-zinc-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-zinc-100">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
              <span>All Payments & Action Items</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Complete breakdown of every scheduled payment cycle, settled status, and next actions.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 border-indigo-200">
            {isOngoing 
              ? `${allInstallments.length} Active Cycle (Ongoing)` 
              : `${allInstallments.length} Total ${allInstallments.length === 1 ? 'Payment' : 'Payments'}`}
          </Badge>
        </CardHeader>

        <CardContent className="p-0 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 font-semibold">
                  <th className="py-3 px-4 w-14 text-center">#</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4 text-right">Cycle Amount</th>
                  <th className="py-3 px-4 text-right">Cumulative</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">What Needs to Be Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {allInstallments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No payment dates generated. Edit the schedule to set frequency or installment dates.
                    </td>
                  </tr>
                ) : (
                  allInstallments.map((inst) => {
                    const isPaid = inst.status === "PAID";
                    const isCurrent = inst.status === "CURRENT";

                    return (
                      <tr
                        key={inst.installmentNumber}
                        className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors ${
                          isCurrent ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-medium" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-bold text-slate-500">
                          {inst.installmentNumber}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {formatDate(inst.dueDate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                          {formatMoney(inst.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          {formatMoney(inst.cumulativeAmount)}
                        </td>
                        <td className="py-3 px-4">
                          {isPaid ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold gap-1 text-[11px] py-0.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled / Paid
                            </Badge>
                          ) : isCurrent ? (
                            <Badge className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 font-semibold gap-1 text-[11px] py-0.5">
                              <Clock className="h-3 w-3 text-amber-600" /> Due Now
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-200 dark:text-zinc-400 text-[11px] py-0.5">
                              Upcoming / Projected
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">
                          {isPaid ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Payment settled & recorded
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={isCurrent ? "default" : "outline"}
                                className={
                                  isCurrent
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-2.5 gap-1.5 font-semibold shadow-2xs"
                                    : "text-xs h-7 px-2.5 gap-1.5 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-300 dark:border-zinc-700"
                                }
                                onClick={() => handleOpenRecordPayment(inst)}
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                Record Payment
                              </Button>
                              {isCurrent ? (
                                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                  Due Now
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">
                                  Upcoming cycle
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Column (7 cols): Request Details & Invoices */}
        <div className="lg:col-span-7 space-y-6">
          {/* Request Details Property Table */}
          <Card className="shadow-xs border-slate-200 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800/80">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Request Details</span>
                <Badge variant="outline" className="text-xs font-normal">
                  ID: #{request.id}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-zinc-800/60 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Requester</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {request.requester}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Assigned To</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {request.assigned_user || "David Caro / David Hernandez"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Type</span>
                  <Badge variant="outline" className="text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold py-0">
                    Recurring
                  </Badge>
                </div>
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Payment Method</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {invoice?.payment_status ? "Direct Billing / Auto-Debit" : "—"}
                  </span>
                </div>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Requested Date</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {formatDate(request.request_date || request.created_at)}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Last Updated</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {formatDate(request.updated_at)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Schedule Timeframe & Range</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {sched.end_date
                      ? `${formatDate(sched.start_date)} – ${formatDate(sched.end_date)}`
                      : `Indefinite (${formatDate(sched.start_date)} – Ongoing)`}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Next Due Date</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-right">
                    {request.due_date ? formatDate(request.due_date) : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Installment Progress</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {sched.total_installments 
                      ? `${sched.completed_installments || 0} / ${sched.total_installments} Cycles Completed` 
                      : `${sched.completed_installments || 0} Cycles Completed (Ongoing)`}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Currency</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                    {request.currency || "USD"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                <div className="p-3.5 flex justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Cycle Amount</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-right">
                    {formatMoney(currentCycleAmount)} USD
                  </span>
                </div>
                <div className="p-3.5 flex justify-between gap-2 bg-slate-50/50 dark:bg-zinc-900/30">
                  <span className="text-muted-foreground font-medium">Total Commitment</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-right">
                    {formatMoney(totalCommitment ?? currentCycleAmount)} USD
                  </span>
                </div>
              </div>

              {request.description && (
                <div className="p-3.5 space-y-1">
                  <span className="text-muted-foreground font-medium block">Description</span>
                  <p className="text-slate-800 dark:text-zinc-200 leading-relaxed bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                    {request.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Invoice Details Card ── */}
          <Card className="shadow-xs border-slate-200 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-600" />
                  <span>Invoice & Billing Records</span>
                  {invoice && (
                    <Badge variant="outline" className="text-xs font-mono ml-2">
                      #{invoice.id}
                    </Badge>
                  )}
                </CardTitle>
                {!invoice && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenRecordPayment(allInstallments[0])}
                    className="text-xs h-7 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record Invoice
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0 text-xs">
              {invoice ? (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                    <div className="p-3.5 flex justify-between gap-2">
                      <span className="text-muted-foreground font-medium">Vendor</span>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                        {invoice.vendor || request.title}
                      </span>
                    </div>
                    <div className="p-3.5 flex justify-between gap-2">
                      <span className="text-muted-foreground font-medium">Amount</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-right">
                        {formatMoney(invoice.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                    <div className="p-3.5 flex justify-between gap-2">
                      <span className="text-muted-foreground font-medium">Bill Date</span>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                        {formatDate(invoice.invoice_date)}
                      </span>
                    </div>
                    <div className="p-3.5 flex justify-between gap-2">
                      <span className="text-muted-foreground font-medium">Date Arrived</span>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                        {formatDate(invoice.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                    <div className="p-3.5 flex justify-between items-center gap-2">
                      <span className="text-muted-foreground font-medium">Payment Status</span>
                      <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold py-0">
                        {invoice.paid_date ? `Settled · ${formatDate(invoice.paid_date)}` : "Settled · " + formatDate(invoice.invoice_date)}
                      </Badge>
                    </div>
                    <div className="p-3.5 flex justify-between items-center gap-2">
                      <span className="text-muted-foreground font-medium">Bank Account</span>
                      <div className="text-right">
                        {renderBankAccountBadge(invoice.bank_account || (request as any)?.bank_account, glCodes)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-zinc-800/60">
                    <div className="p-3.5 flex justify-between items-center gap-2">
                      <span className="text-muted-foreground font-medium">Category</span>
                      <div className="text-right">
                        {renderCategoryBadge(invoice.gl_code || invoice.category || request.gl_code || request.category, glCodes)}
                      </div>
                    </div>
                    <div className="p-3.5 flex justify-between items-center gap-2">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <span>Asset Flag</span>
                        <HelpIcon text="Asset Flag designates whether this invoice represents a Capitalized Fixed Asset (CapEx) — such as equipment, hardware, lease/financing agreements, or software licenses — rather than an immediate operational expense (OpEx). When checked, the cost is capitalized on the balance sheet and depreciated/amortized over time instead of expensed in full in the current period. It automatically defaults to active for Scheduled Payments, Recurring obligations, and Accounts Payable." />
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100 text-right">
                        {invoice.asset_flag ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground space-y-2">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-700" />
                  <p className="text-xs">No invoice recorded for this recurring schedule item yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenRecordPayment(allInstallments[0])}
                    className="text-xs mt-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Record First Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Scheduled Horizon & Tabbed Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Scheduled Range & Payment Horizon Card */}
          <Card className="shadow-xs border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900">
            <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-indigo-600" />
                  <span>Scheduled Range & Payment Horizon</span>
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Scheduled Horizon Range */}
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Scheduled Horizon</span>
                <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>{formatDate(sched.start_date)}</span>
                  <span className="text-slate-400 font-normal">to</span>
                  <span>{sched.end_date ? formatDate(sched.end_date) : "Ongoing"}</span>
                </div>
              </div>

              {/* Remaining Duration Banner */}
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Remaining Duration</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold text-[11px]">
                    {durationInfo.text}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  {isCustomMilestones
                    ? `${sched.schedule_dates?.length || sched.total_installments || 0} Milestone Dates (${formatMoney(currentCycleAmount)} / ${allCyclesCompleted ? "last milestone" : "cycle"})`
                    : `${FREQUENCY_LABELS[sched.frequency as FrequencyType] || "Monthly"} (${formatMoney(currentCycleAmount)} / cycle)`}
                </div>
              </div>

              {/* Cycle Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600 dark:text-zinc-400">Cycle Progress</span>
                  <span className="text-slate-900 dark:text-zinc-100">
                    {sched.total_installments 
                      ? `${sched.completed_installments || 0} / ${sched.total_installments} Cycles` 
                      : `${sched.completed_installments || 0} Cycles Settled (Ongoing)`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: sched.total_installments 
                        ? `${Math.min(
                            100,
                            Math.round(
                              ((sched.completed_installments || 0) / sched.total_installments) * 100
                            )
                          )}%`
                        : ((sched.completed_installments || 0) > 0 ? "100%" : "0%"),
                    }}
                  />
                </div>
              </div>

              {/* Total Commitment Summary Box */}
              <div className="p-3.5 rounded-xl bg-indigo-600 text-white space-y-1 shadow-xs">
                <div className="text-[11px] font-medium text-indigo-200">
                  {totalCommitment != null ? "Total Commitment" : "Cycle Commitment"}
                </div>
                <div className="text-xl font-black font-mono tracking-tight">
                  {totalCommitment != null 
                    ? formatMoney(totalCommitment) 
                    : `${formatMoney(sched.amount_per_cycle || request.amount)} / cycle`}
                </div>
                <div className="text-[11px] text-indigo-100 flex items-center justify-between pt-1 border-t border-indigo-500/60">
                  <span>{formatMoney(paidToDate)} paid to date</span>
                  <span>
                    {totalCommitment != null 
                      ? `${formatMoney(Math.max(0, totalCommitment - paidToDate))} remaining` 
                      : "Ongoing Billing"}
                  </span>
                </div>
              </div>

              {/* Ledger Breakdown Modal Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScheduleLedgerOpen(true)}
                className="w-full text-xs font-semibold bg-white dark:bg-zinc-950 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 gap-1.5"
              >
                <CalendarClock className="h-3.5 w-3.5 text-indigo-600" />
                View Full Milestone Schedule / Ledger
              </Button>
            </CardContent>
          </Card>

          {/* ── Tabs: Approvals, Attachments & History ── */}
          <Card className="shadow-xs border-slate-200 dark:border-zinc-800">
            <Tabs defaultValue="approvals" className="w-full">
              <CardHeader className="p-3 pb-0 border-b border-slate-100 dark:border-zinc-800">
                <TabsList className="grid grid-cols-3 w-full h-8 bg-slate-100 dark:bg-zinc-800">
                  <TabsTrigger value="approvals" className="text-xs">
                    Approvals ({approvals.length})
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="text-xs">
                    Attachments ({attachments.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">
                    History ({history.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-4 text-xs">
                {/* Approvals Tab */}
                <TabsContent value="approvals" className="mt-0 space-y-3">
                  {approvals.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground space-y-1.5">
                      <ShieldCheck className="h-7 w-7 mx-auto text-slate-300 dark:text-zinc-700" />
                      <p className="font-semibold text-slate-700 dark:text-zinc-300">No approval activity yet</p>
                      <p className="text-[11px]">
                        Approval records will appear here as formal reviews and sign-offs are submitted.
                      </p>
                    </div>
                  ) : (
                    approvals.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-zinc-100">
                            {app.approver}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              app.decision === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-rose-50 text-rose-700 border-rose-300"
                            }
                          >
                            {app.decision}
                          </Badge>
                        </div>
                        {app.comment && (
                          <p className="text-slate-600 dark:text-zinc-400 italic text-[11px]">
                            "{app.comment}"
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground block">
                          {formatDate(app.approval_date)}
                        </span>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="mt-0 space-y-3">
                  {attachments.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground space-y-1.5">
                      <Paperclip className="h-7 w-7 mx-auto text-slate-300 dark:text-zinc-700" />
                      <p className="font-semibold text-slate-700 dark:text-zinc-300">No files attached</p>
                      <p className="text-[11px]">Upload invoice receipts, contract agreements, or POs.</p>
                    </div>
                  ) : (
                    attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white dark:bg-zinc-950"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span className="font-medium truncate text-slate-800 dark:text-zinc-200">
                            {att.filename}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {Math.round(att.size / 1024)} KB
                        </span>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-0 space-y-2 max-h-60 overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground space-y-1">
                      <History className="h-7 w-7 mx-auto text-slate-300 dark:text-zinc-700" />
                      <p className="font-semibold text-slate-700 dark:text-zinc-300">No activity history yet</p>
                    </div>
                  ) : (
                    history.map((hist) => (
                      <div
                        key={hist.id}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-zinc-200">
                          <span>{hist.changed_by_name || hist.changed_by}</span>
                          <span className="text-muted-foreground font-normal text-[10px]">
                            {formatDate(hist.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-zinc-400">
                          {hist.action}: {hist.old_value ? `${hist.old_value} ➔ ` : ""}
                          <strong className="text-slate-900 dark:text-zinc-100">{hist.new_value || hist.comment}</strong>
                        </p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* ── Edit Request Modal ── */}
      {isEditOpen && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1440px] 2xl:max-w-[1600px] max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-2xl">
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs shrink-0">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                      Edit Recurring Payment Request #{request.id}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Update recurring subscription details, amount, schedule milestones, and GL account mapping.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 py-2">
                {/* Left Column: General Details */}
                <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Title / Service Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="h-10 text-sm font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Amount (USD) <span className="text-red-500">*</span>
                        </label>
                        {editForm.is_scheduled && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            (Managed by Schedule)
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={
                            editForm.is_scheduled && editForm.frequency === "CUSTOM" && editForm.schedule_dates.length > 0
                              ? (editForm.schedule_dates.reduce((acc, itm) => acc + (itm.amount != null ? itm.amount : 0), 0) || "").toString()
                              : editForm.amount
                          }
                          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          disabled={editForm.is_scheduled}
                          className="h-10 text-sm font-mono pl-7 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
                          required={!editForm.is_scheduled}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Next Due Date</label>
                        {editForm.is_scheduled && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            (Managed by Schedule)
                          </span>
                        )}
                      </div>
                      <Input
                        type="date"
                        value={
                          editForm.is_scheduled && editForm.frequency === "CUSTOM" && editForm.schedule_dates.length > 0
                            ? (editForm.schedule_dates[0]?.date || editForm.due_date)
                            : editForm.due_date
                        }
                        onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                        disabled={editForm.is_scheduled}
                        className="h-10 text-sm disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Requester</label>
                      <Input
                        value={editForm.requester}
                        onChange={(e) => setEditForm({ ...editForm, requester: e.target.value })}
                        className="h-10 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Department</label>
                      <Input
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="h-10 text-sm"
                        required
                      />
                    </div>
                  </div>




                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Description / Terms</label>
                    <textarea
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2.5 flex-1 min-h-[95px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Right Column: Schedule Dates Builder */}
                <div className="lg:col-span-6 flex flex-col h-full">
                  <ScheduleDatesBuilder
                    isScheduled={editForm.is_scheduled}
                    onIsScheduledChange={(val) => setEditForm((p) => ({ ...p, is_scheduled: val }))}
                    frequency={editForm.frequency}
                    onFrequencyChange={(val) => setEditForm((p) => ({ ...p, frequency: val }))}
                    startDate={editForm.start_date}
                    onStartDateChange={(val) => setEditForm((p) => ({ ...p, start_date: val }))}
                    endDate={editForm.end_date}
                    onEndDateChange={(val) => setEditForm((p) => ({ ...p, end_date: val }))}
                    scheduleDates={editForm.schedule_dates}
                    onScheduleDatesChange={(dates) => setEditForm((p) => ({ ...p, schedule_dates: dates }))}
                    baseAmount={parseFloat(editForm.amount) || 0}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Record Invoice Dialog ── */}
      {isRecordInvoiceOpen && (
        <Dialog open={isRecordInvoiceOpen} onOpenChange={setIsRecordInvoiceOpen}>
          <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <span>Record Payment for #{request.id}</span>
                {selectedInstallment && (
                  <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
                    Cycle #{selectedInstallment.installmentNumber}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Record payment details, bank account, and category for billing processing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRecordInvoiceSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={invoiceForm.vendor}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor: e.target.value })}
                  placeholder="e.g. Netflix, AWS"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Amount (USD) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Bill Date</label>
                  <Input
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Bank Account <span className="text-red-500">*</span>
                </label>
                <BankAccountAutocomplete
                  value={invoiceForm.bank_account}
                  onChange={(val) => setInvoiceForm({ ...invoiceForm, bank_account: val })}
                  placeholder="Select Bank Account *"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <CategoryAutocomplete
                  value={invoiceForm.gl_code}
                  onChange={(val) => setInvoiceForm({ ...invoiceForm, gl_code: val })}
                  placeholder="Select Category *"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Notes / Description</label>
                <Input
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  placeholder="Optional billing note..."
                />
              </div>

              {/* PDF Attachment Dropzone */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Attach Invoice (.PDF)</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Accepted: .pdf</span>
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPdf(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingPdf(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPdf(false);
                    const droppedFiles = Array.from(e.dataTransfer.files).filter(
                      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
                    );
                    if (droppedFiles.length === 0) {
                      toast.error("Only PDF (.pdf) files are accepted");
                      return;
                    }
                    setInvoiceFiles((prev) => [...prev, ...droppedFiles]);
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isDraggingPdf
                      ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/30"
                  }`}
                  onClick={() => document.getElementById("invoice-pdf-upload-input")?.click()}
                >
                  <input
                    id="invoice-pdf-upload-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const selectedFiles = Array.from(e.target.files).filter(
                          (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
                        );
                        if (selectedFiles.length === 0) {
                          toast.error("Only PDF (.pdf) files are accepted");
                          return;
                        }
                        setInvoiceFiles((prev) => [...prev, ...selectedFiles]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                    <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                    </div>
                    <p className="text-[11px] text-muted-foreground">PDF invoice copies or payment receipts (max 25MB each)</p>
                  </div>
                </div>

                {invoiceFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {invoiceFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border bg-white dark:bg-zinc-900 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-zinc-200 truncate">{file.name}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsRecordInvoiceOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordInvoiceMutation.isPending || uploadMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {recordInvoiceMutation.isPending || uploadMutation.isPending ? "Recording..." : "Save Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Schedule Breakdown Ledger Modal ── */}
      <ScheduleBreakdownModal
        request={request}
        open={isScheduleLedgerOpen}
        onOpenChange={setIsScheduleLedgerOpen}
        onEditRequest={() => {
          setIsScheduleLedgerOpen(false);
          handleOpenEdit();
        }}
      />
    </div>
  );
}
