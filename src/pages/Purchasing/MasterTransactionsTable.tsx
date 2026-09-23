import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { PurchaseRequest } from "@/types/purchasing";
import {
  formatDate,
  formatMoney,
} from "./purchasingMeta";
import {
  generatePaymentSchedule,
  type ProjectedInstallment,
  type FrequencyType,
  FREQUENCY_LABELS,
} from "./recurringScheduleUtils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ExternalLink,
  TrendingUp,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface MasterTransactionItem {
  id: string;
  requestId: string;
  requestTitle: string;
  requestDescription?: string | null;
  requester: string;
  department: string;
  vendor: string;
  category: string;
  project?: string;
  dueDate: string;
  amount: number;
  currency: string;
  cumulativeAmount: number;
  installmentNumber: number;
  totalInstallments: number | null;
  installmentStatus: "PAID" | "CURRENT" | "PROJECTED";
  workflowStatus: string;
  reviewStatus: string;
  isCustom: boolean;
  frequency: string;
  customLabel?: string | null;
  rawRequest: PurchaseRequest;
  rawInstallment: ProjectedInstallment;
}

interface MasterTransactionsTableProps {
  requests: PurchaseRequest[];
  isLoading?: boolean;
  isAP?: boolean;
  isSuperAdmin?: boolean;
  onOpenBreakdownModal: (request: PurchaseRequest) => void;
  onToggleReviewStatus?: (request: PurchaseRequest) => void;
  reviewMutationPending?: boolean;
}

export const MasterTransactionsTable: React.FC<MasterTransactionsTableProps> = ({
  requests,
  isLoading = false,
  isAP = false,
  isSuperAdmin = false,
  onOpenBreakdownModal,
  onToggleReviewStatus,
  reviewMutationPending = false,
}) => {
  const navigate = useNavigate();

  // Local state for Master View filters and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("FROM_TODAY");
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState<string>("ALL");
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"dueDate" | "amount" | "installmentNumber" | "requestTitle" | "requester">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 1. Flatten all requests into discrete transactions / installments
  const allTransactions: MasterTransactionItem[] = useMemo(() => {
    const list: MasterTransactionItem[] = [];

    requests.forEach((req) => {
      const schedule = req.recurring_schedule;
      const installments = generatePaymentSchedule(
        schedule,
        req.amount || 0,
        req.currency || "USD",
        req.status,
        req.due_date || req.request_date
      );

      const customDates = schedule?.schedule_dates || [];
      const totalCount =
        schedule?.total_installments ||
        (customDates.length > 0 ? customDates.length : (schedule?.end_date ? installments.length : null));
      const isCustom = schedule?.frequency === "CUSTOM" || customDates.length > 0;

      installments.forEach((inst, idx) => {
        let label: string | undefined | null;
        if (isCustom && customDates[idx]) {
          const cDate = customDates[idx];
          label = typeof cDate === "object" ? cDate.note : undefined;
        }

        list.push({
          id: `${req.id}-inst-${inst.installmentNumber}-${inst.dueDate || idx}`,
          requestId: req.id,
          requestTitle: req.title,
          requestDescription: req.description,
          requester: req.requester,
          department: req.department,
          vendor: (req as any).vendor || (req as any).company_name || "",
          category: (req as any).category || "",
          project: (req as any).project || (req as any).project_name || "",
          dueDate: inst.dueDate,
          amount: inst.amount,
          currency: inst.currency || req.currency || "USD",
          cumulativeAmount: inst.cumulativeAmount,
          installmentNumber: inst.installmentNumber,
          totalInstallments: totalCount,
          installmentStatus: inst.status,
          workflowStatus: req.status,
          reviewStatus: req.review_status || "WAITING_FOR_REVIEW",
          isCustom,
          frequency: schedule?.frequency || "MONTHLY",
          customLabel: label,
          rawRequest: req,
          rawInstallment: inst,
        });
      });
    });

    return list;
  }, [requests]);

  // 2. Master View KPIs Calculation
  const stats = useMemo(() => {
    let totalValue = 0;
    let paidCount = 0;
    let paidValue = 0;
    let currentCount = 0;
    let currentValue = 0;
    let projectedCount = 0;
    let projectedValue = 0;
    let reviewedCount = 0;

    allTransactions.forEach((t) => {
      totalValue += t.amount;
      if (t.installmentStatus === "PAID") {
        paidCount++;
        paidValue += t.amount;
      } else if (t.installmentStatus === "CURRENT") {
        currentCount++;
        currentValue += t.amount;
      } else {
        projectedCount++;
        projectedValue += t.amount;
      }

      if (t.reviewStatus === "REVIEWED") {
        reviewedCount++;
      }
    });

    return {
      totalTransactions: allTransactions.length,
      totalValue,
      paidCount,
      paidValue,
      currentCount,
      currentValue,
      projectedCount,
      projectedValue,
      reviewedCount,
    };
  }, [allTransactions]);

  // 3. Filter and Sort Transactions
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allTransactions
      .filter((t) => {
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = t.requestTitle?.toLowerCase().includes(q);
          const matchReqId = t.requestId?.toLowerCase().includes(q);
          const matchRequester = t.requester?.toLowerCase().includes(q);
          const matchDept = t.department?.toLowerCase().includes(q);
          const matchVendor = t.vendor?.toLowerCase().includes(q);
          const matchDesc = t.requestDescription?.toLowerCase().includes(q);
          const matchLabel = t.customLabel?.toLowerCase().includes(q);
          const matchDueDate = t.dueDate?.includes(q);
          if (!matchTitle && !matchReqId && !matchRequester && !matchDept && !matchVendor && !matchDesc && !matchLabel && !matchDueDate) {
            return false;
          }
        }

        // Installment status filter
        if (installmentStatusFilter !== "ALL" && t.installmentStatus !== installmentStatusFilter) {
          return false;
        }

        // Review status filter
        if (reviewFilter !== "ALL") {
          if (reviewFilter === "REVIEWED" && t.reviewStatus !== "REVIEWED") return false;
          if (reviewFilter === "WAITING_FOR_REVIEW" && t.reviewStatus === "REVIEWED") return false;
        }

        // Date range filter
        if (dateRangeFilter !== "ALL") {
          if (!t.dueDate) return false;
          const tDate = new Date(t.dueDate.includes("T") ? t.dueDate : t.dueDate + "T00:00:00");
          tDate.setHours(0, 0, 0, 0);

          if (dateRangeFilter === "FROM_TODAY") {
            if (tDate < today) return false;
          } else if (dateRangeFilter === "PAID") {
            if (t.installmentStatus !== "PAID") return false;
          } else if (dateRangeFilter === "THIS_MONTH") {
            const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            if (tDate < startMonth || tDate > endMonth) return false;
          } else if (dateRangeFilter === "NEXT_30") {
            const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (tDate < today || tDate > maxDate) return false;
          } else if (dateRangeFilter === "NEXT_90") {
            const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
            if (tDate < today || tDate > maxDate) return false;
          } else if (dateRangeFilter === "THIS_YEAR") {
            const startYear = new Date(today.getFullYear(), 0, 1);
            const endYear = new Date(today.getFullYear(), 11, 31);
            if (tDate < startYear || tDate > endYear) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "dueDate") {
          const dateA = a.dueDate ? new Date(a.dueDate.includes("T") ? a.dueDate : a.dueDate + "T00:00:00").getTime() : 0;
          const dateB = b.dueDate ? new Date(b.dueDate.includes("T") ? b.dueDate : b.dueDate + "T00:00:00").getTime() : 0;
          cmp = dateA - dateB;
        } else if (sortField === "amount") {
          cmp = a.amount - b.amount;
        } else if (sortField === "installmentNumber") {
          cmp = a.installmentNumber - b.installmentNumber;
        } else if (sortField === "requestTitle") {
          cmp = (a.requestTitle || "").localeCompare(b.requestTitle || "");
        } else if (sortField === "requester") {
          cmp = (a.requester || "").localeCompare(b.requester || "");
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [allTransactions, searchTerm, installmentStatusFilter, reviewFilter, dateRangeFilter, sortField, sortOrder]);

  const [displayCount, setDisplayCount] = useState(50);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setDisplayCount(50);
  }, [searchTerm, dateRangeFilter, installmentStatusFilter, reviewFilter, sortField, sortOrder]);

  const lastElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => prev + 50);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading]);

  const visibleTransactions = filteredTransactions.slice(0, displayCount);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Due Date",
      "Installment #",
      "Total Installments",
      "Request ID",
      "Subscription Title",
      "Vendor",
      "Requester",
      "Department",
      "Project",
      "Amount",
      "Currency",
      "Cumulative Amount",
      "Installment Status",
      "Review Status",
      "Workflow Status",
      "Milestone Note",
    ];

    const rows = filteredTransactions.map((t) => [
      t.dueDate || "",
      t.installmentNumber,
      t.totalInstallments || "N/A",
      `#${t.requestId}`,
      `"${(t.requestTitle || "").replace(/"/g, '""')}"`,
      `"${(t.vendor || "").replace(/"/g, '""')}"`,
      `"${(t.requester || "").replace(/"/g, '""')}"`,
      `"${(t.department || "").replace(/"/g, '""')}"`,
      `"${(t.project || "").replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.currency,
      t.cumulativeAmount.toFixed(2),
      t.installmentStatus,
      t.reviewStatus,
      t.workflowStatus,
      `"${(t.customLabel || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `master_scheduled_transactions_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredTransactions.length} transactions to CSV`);
  };

  const filteredTotalValue = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const getUrgencyBadge = (dueDateStr: string, status: "PAID" | "CURRENT" | "PROJECTED") => {
    if (status === "PAID") {
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
        >
          <CheckCircle className="h-2.5 w-2.5 mr-1" />
          Paid
        </Badge>
      );
    }
    if (!dueDateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dueDateStr.includes("T") ? dueDateStr : dueDateStr + "T00:00:00");
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold shadow-xs">
          Overdue ({Math.abs(diffDays)}d)
        </Badge>
      );
    }
    if (diffDays === 0) {
      return (
        <Badge className="text-[10px] py-0 px-1.5 bg-amber-600 text-white font-bold animate-pulse">
          Due Today
        </Badge>
      );
    }
    if (diffDays <= 7) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-semibold"
        >
          Due in {diffDays}d
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-zinc-400"
      >
        In {diffDays}d
      </Badge>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Master View KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
        {/* Total Scheduled Volume */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 rounded-lg shadow-xs bg-slate-50/40 dark:bg-zinc-900/40">
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Total Transactions
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight mt-0.5">
                {stats.totalTransactions}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                {formatMoney(stats.totalValue)} volume
              </p>
            </div>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 shrink-0">
              <Layers size={16} />
            </div>
          </CardContent>
        </Card>

        {/* Paid / Executed */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 rounded-lg shadow-xs bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Paid / Settled
              </p>
              <h3 className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                {stats.paidCount}
              </h3>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">
                {formatMoney(stats.paidValue)} settled
              </p>
            </div>
            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </CardContent>
        </Card>

        {/* Current / Due Next */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 rounded-lg shadow-xs bg-amber-50/20 dark:bg-amber-950/20">
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                Current / Due Next
              </p>
              <h3 className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
                {stats.currentCount}
              </h3>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium">
                {formatMoney(stats.currentValue)} pending
              </p>
            </div>
            <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={16} />
            </div>
          </CardContent>
        </Card>

        {/* Projected Future */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 rounded-lg shadow-xs bg-indigo-50/20 dark:bg-indigo-950/20">
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                Future Projected
              </p>
              <h3 className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">
                {stats.projectedCount}
              </h3>
              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5 font-medium">
                {formatMoney(stats.projectedValue)} forecast
              </p>
            </div>
            <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
              <TrendingUp size={16} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Master View Filter & Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
          {/* Text Search */}
          <div className="relative flex-1 w-full">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Filter transactions by title, request ID, requester, vendor, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8.5 text-xs"
            />
          </div>

          {/* Quick Date Range Filter */}
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-full sm:w-[165px] h-8.5 text-xs font-medium">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FROM_TODAY">From Today Onwards</SelectItem>
              <SelectItem value="THIS_MONTH">Due This Month</SelectItem>
              <SelectItem value="NEXT_30">Next 30 Days</SelectItem>
              <SelectItem value="NEXT_90">Next 90 Days</SelectItem>
              <SelectItem value="THIS_YEAR">{`This Year (${new Date().getFullYear()})`}</SelectItem>
              <SelectItem value="PAID">Paid / Historical</SelectItem>
              <SelectItem value="ALL">All Dates</SelectItem>
            </SelectContent>
          </Select>

          {/* Installment Status Filter */}
          <Select value={installmentStatusFilter} onValueChange={setInstallmentStatusFilter}>
            <SelectTrigger className="w-full sm:w-[145px] h-8.5 text-xs font-medium">
              <SelectValue placeholder="Schedule Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Schedules</SelectItem>
              <SelectItem value="PAID">Paid Only</SelectItem>
              <SelectItem value="CURRENT">Current / Due Next</SelectItem>
              <SelectItem value="PROJECTED">Projected Future</SelectItem>
            </SelectContent>
          </Select>

          {/* Review Status Filter */}
          <Select value={reviewFilter} onValueChange={setReviewFilter}>
            <SelectTrigger className="w-full sm:w-[145px] h-8.5 text-xs font-medium">
              <SelectValue placeholder="Review Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Reviews</SelectItem>
              <SelectItem value="REVIEWED">Reviewed (AP)</SelectItem>
              <SelectItem value="WAITING_FOR_REVIEW">Waiting Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export & Reset Actions */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8.5 gap-1.5 text-xs font-medium border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 shrink-0"
            title="Export master transactions list to CSV"
          >
            <Download size={13} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 3. Master Transactions Table */}
      <Card className="border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xs bg-white dark:bg-zinc-900 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] min-h-[400px]">
        <div className="flex-1 min-h-0 overflow-auto relative">
          <Table containerClassName="overflow-visible">
            <TableHeader className="sticky top-0 bg-slate-50 dark:bg-zinc-900 z-10 shadow-2xs">
              <TableRow className="border-b border-slate-200 dark:border-zinc-800 text-xs">
                <TableHead
                  className="cursor-pointer select-none font-semibold text-slate-700 dark:text-zinc-200"
                  onClick={() => toggleSort("dueDate")}
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    {sortField === "dueDate" ? (
                      sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-muted-foreground opacity-50" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer select-none font-semibold text-slate-700 dark:text-zinc-200"
                  onClick={() => toggleSort("requestTitle")}
                >
                  <div className="flex items-center gap-1">
                    <span>Contract / Request Title</span>
                    {sortField === "requestTitle" ? (
                      sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-muted-foreground opacity-50" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer select-none font-semibold text-slate-700 dark:text-zinc-200"
                  onClick={() => toggleSort("installmentNumber")}
                >
                  <div className="flex items-center gap-1">
                    <span>Installment</span>
                    {sortField === "installmentNumber" ? (
                      sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-muted-foreground opacity-50" />
                    )}
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-slate-700 dark:text-zinc-200">
                  Requester / Dept
                </TableHead>

                <TableHead
                  className="text-right cursor-pointer select-none font-semibold text-slate-700 dark:text-zinc-200"
                  onClick={() => toggleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    {sortField === "amount" ? (
                      sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="text-muted-foreground opacity-50" />
                    )}
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-slate-700 dark:text-zinc-200">
                  Schedule Status
                </TableHead>

                <TableHead className="font-semibold text-slate-700 dark:text-zinc-200">
                  AP Review
                </TableHead>

                <TableHead className="text-right font-semibold text-slate-700 dark:text-zinc-200">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs">Generating master schedule transactions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <CalendarClock className="h-7 w-7 text-muted-foreground opacity-40 mb-1" />
                      <p className="text-sm font-medium">No transactions found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search criteria or date range filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {visibleTransactions.map((t, index) => {
                    const isLast = index === visibleTransactions.length - 1;
                    const isRev = t.reviewStatus === "REVIEWED";
                    return (
                      <TableRow
                        key={t.id}
                        ref={isLast ? lastElementRef : null}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors group text-xs"
                        onClick={() => navigate(`/purchasing/requests/${t.requestId}`)}
                      >
                        {/* 1. Due Date + Urgency */}
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className="font-semibold text-slate-900 dark:text-zinc-100">
                              {t.dueDate ? formatDate(t.dueDate) : "Undated"}
                            </span>
                            {getUrgencyBadge(t.dueDate, t.installmentStatus)}
                          </div>
                        </TableCell>

                        {/* 2. Contract Title + ID + Vendor */}
                        <TableCell className="max-w-[280px]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                #{t.requestId}
                              </span>
                              <span className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400 text-xs transition-colors truncate">
                                {t.requestTitle}
                              </span>
                            </div>
                            {t.customLabel ? (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                • {t.customLabel}
                              </span>
                            ) : t.vendor ? (
                              <span className="text-[11px] text-muted-foreground truncate">
                                {t.vendor}
                              </span>
                            ) : t.requestDescription ? (
                              <span className="text-[11px] text-muted-foreground truncate">
                                {t.requestDescription}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* 3. Installment / Cycle */}
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium py-0 px-1.5 bg-indigo-50/70 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                            >
                              {t.totalInstallments
                                ? `Inst #${t.installmentNumber} of ${t.totalInstallments}`
                                : `Cycle #${t.installmentNumber}`}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {FREQUENCY_LABELS[t.frequency as FrequencyType] || t.frequency}
                            </span>
                          </div>
                        </TableCell>

                        {/* 4. Requester & Department */}
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-800 dark:text-zinc-200">
                              {t.requester}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {t.department || "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* 5. Amount & Cumulative Progress */}
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-bold text-slate-900 dark:text-zinc-100 text-[13px]">
                              {formatMoney(t.amount)}
                            </span>
                            {t.cumulativeAmount > 0 && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                Cumul: {formatMoney(t.cumulativeAmount)}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Schedule Status */}
                        <TableCell className="whitespace-nowrap">
                          {t.installmentStatus === "PAID" ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit"
                            >
                              <CheckCircle2 size={11} />
                              Paid
                            </Badge>
                          ) : t.installmentStatus === "CURRENT" ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit"
                            >
                              <Clock size={11} />
                              Due Next
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-800/60 dark:text-zinc-300 w-fit"
                            >
                              Projected
                            </Badge>
                          )}
                        </TableCell>

                        {/* 7. AP Review Status */}
                        <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {isAP || isSuperAdmin ? (
                            <button
                              onClick={() => onToggleReviewStatus?.(t.rawRequest)}
                              disabled={reviewMutationPending}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs hover:opacity-80 ${
                                isRev
                                  ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
                                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                              }`}
                              title="Click to toggle Review Status for this contract"
                            >
                              {isRev ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              {isRev ? "Reviewed" : "Waiting Review"}
                            </button>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                isRev
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-amber-50 text-amber-700 border-amber-300"
                              }
                            >
                              {isRev ? "Reviewed" : "Waiting Review"}
                            </Badge>
                          )}
                        </TableCell>

                        {/* 8. Quick Actions */}
                        <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="View Full Payment Schedule / Ledger"
                              onClick={() => onOpenBreakdownModal(t.rawRequest)}
                            >
                              <CalendarClock size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              title="Open Request Detail"
                              onClick={() => navigate(`/purchasing/requests/${t.requestId}`)}
                            >
                              <ExternalLink size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visibleTransactions.length < filteredTransactions.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-12 text-center text-muted-foreground text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          <span>Loading more... ({visibleTransactions.length} of {filteredTransactions.length})</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer Summary */}
        <div className="bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900 dark:text-zinc-100">{visibleTransactions.length}</strong> of{" "}
              <strong>{filteredTransactions.length}</strong> matching transactions
              {filteredTransactions.length !== allTransactions.length && ` (Total: ${allTransactions.length})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Filtered Total:</span>
            <strong className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {formatMoney(filteredTotalValue)}
            </strong>
          </div>
        </div>
      </Card>
    </div>
  );
};
