import { FloatingVerticalFilter } from "@/components/ui/FloatingVerticalFilter";
import { ScheduleDatesBuilder } from "./ScheduleDatesBuilder";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import { RequestStatus, type PurchaseRequest,
  type RecurringNotificationSettings, type RequestDetail, type CustomScheduleDate } from "@/types/purchasing";
import { parseRequestStatus } from "@/lib/requestStatus";
import {
  formatDate,
  formatMoney,
  getStatusBadge,
  getStatusLabel,
} from "./purchasingMeta";
import { useAuth } from "@/lib/AuthContext";
import { useUsersList, useRolesList } from "@/hooks/usePurchasing";
import { resolveUserDepartment } from "@/lib/userDepartment";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Table as TableIcon,
  Plus,
  AlertTriangle,
  Settings,
  Send,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Edit2,
  XCircle,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatRemainingDuration,
  calculateInstallmentsCount,
  generatePaymentSchedule,
  getRecurringAmounts,
  formatDateToIso,
  type FrequencyType,
} from "./recurringScheduleUtils";
import { ScheduleBreakdownModal } from "./ScheduleBreakdownModal";
import { MasterTransactionsTable } from "./MasterTransactionsTable";

import {
  DebtSchedulePreviewModal,
  type DebtSchedulePreviewData,
  type DebtSchedulePreviewRecord,
} from "@/components/Purchasing/DebtSchedulePreviewModal";

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

function RequesterAutocomplete({
  value,
  onChange,
  onSelectUser,
  users = [],
  roles = [],
  label = "Requester",
  required = false,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectUser?: (user: any) => void;
  users: Array<{ id: string; full_name?: string; email?: string; department?: string; [key: string]: any }>;
  roles?: any[];
  label?: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = useMemo(() => {
    const activeUsers = users.filter((u) => u.is_active !== false);
    const q = (value || "").toLowerCase().trim();
    if (!q) return activeUsers.slice(0, 10);
    return activeUsers
      .filter((u) => {
        const name = (u.full_name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const dept = resolveUserDepartment(u, roles).toLowerCase();
        return name.includes(q) || email.includes(q) || dept.includes(q);
      })
      .slice(0, 10);
  }, [value, users, roles]);

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {label && (
        <label className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Input
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search requester (e.g. Rachad, Rachel)..."
          className="w-full"
          required
        />
        {isOpen && filteredUsers.length > 0 && (
          <div className="absolute z-50 left-0 mt-1.5 w-full max-h-60 overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-sm divide-y divide-slate-100 dark:divide-zinc-800/60">
            {filteredUsers.map((u) => {
              const displayName = u.full_name || u.email || "Unknown User";
              const email = u.email;
              const dept = resolveUserDepartment(u, roles);

              return (
                <div
                  key={u.id}
                  className="px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex flex-col gap-0.5 transition-colors text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(displayName);
                    if (onSelectUser) {
                      onSelectUser(u);
                    }
                    setIsOpen(false);
                  }}
                >
                  <div className="font-semibold text-slate-900 dark:text-zinc-100 text-sm leading-snug">
                    {displayName}
                  </div>
                  {email && (
                    <div className="text-xs text-slate-500 dark:text-zinc-400 truncate leading-snug">
                      {email}
                    </div>
                  )}
                  {dept ? (
                    <div className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                      <span className="text-slate-400 dark:text-zinc-500 font-normal">Dept:</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{dept}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 italic mt-0.5">
                      No department
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getDueStatus(dateStr?: string | null, status?: string) {
  if (!dateStr || status === "COMPLETED" || status === "REJECTED") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: `Overdue (${Math.abs(diffDays)}d)`, variant: "destructive" as const, className: "", isUrgent: true };
  } else if (diffDays === 0) {
    return { label: "Due Today", variant: "default" as const, className: "bg-rose-600 hover:bg-rose-700 text-white font-bold", isUrgent: true };
  } else if (diffDays === 1) {
    return { label: "Due Tomorrow", variant: "default" as const, className: "bg-amber-600 hover:bg-amber-700 text-white font-semibold", isUrgent: true };
  } else if (diffDays <= 7) {
    return { label: `Due in ${diffDays}d`, variant: "outline" as const, className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-medium", isUrgent: true };
  }
  return null;
}

export default function RecurringPayments() {
  const kpiRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { id: routeRequestId } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { roles: userRoles, hasRole, hasPermission, user } = useAuth();
  const { data: usersList = [] } = useUsersList();
  const { data: rolesList = [] } = useRolesList();

  // Role check: Only TREASURY, AP, and SUPER_ADMIN
  const isSuperAdmin = hasRole("SUPER_ADMIN") || user?.is_super_admin;
  const isAP =
    userRoles.some((r) => {
      const c = (r.code || "").toUpperCase();
      const n = (r.name || "").toUpperCase();
      return (
        c.includes("AP") ||
        c.includes("PAY") ||
        n.includes("AP") ||
        n.includes("PAY")
      );
    }) ||
    hasRole("ACCTS_PAY") ||
    hasRole("AP");
  const isTreasury = userRoles.some((r) => {
    const c = (r.code || "").toUpperCase();
    const n = (r.name || "").toUpperCase();
    return c.includes("TREASURY") || n.includes("TREASURY");
  });
  const hasRecurringPermission =
    hasPermission("RECURRING_PAYMENTS_READ") ||
    hasPermission("RECURRING_PAYMENTS_VIEW") ||
    hasPermission("RECURRING_PAYMENTS_UPDATE");
  const canAccess = isSuperAdmin || isAP || isTreasury || hasRecurringPermission;

  const [viewMode, setViewMode] = useState<"table" | "calendar" | "master">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter")?.toUpperCase() || "ALL";
  const [cardFilter, setCardFilter] = useState<string>(initialFilter);

  useEffect(() => {
    const f = searchParams.get("filter")?.toUpperCase() || "ALL";
    setCardFilter(f);
  }, [searchParams]);

  const handleCardFilterChange = (newFilter: string) => {
    setCardFilter(newFilter);
    if (newFilter === "ALL") {
      searchParams.delete("filter");
    } else {
      searchParams.set("filter", newFilter);
    }
    setSearchParams(searchParams, { replace: true });
  };
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scheduleModalRequest, setScheduleModalRequest] = useState<PurchaseRequest | null>(null);
  const [selectedCalendarInstallment, setSelectedCalendarInstallment] = useState<{
    installmentNumber?: number;
    totalInstallments?: number;
    amount?: number;
    dueDate?: string;
    isProjected?: boolean;
    isPaid?: boolean;
  } | null>(null);

  // File import & preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<DebtSchedulePreviewData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isSavingImport, setIsSavingImport] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<DebtSchedulePreviewData>(
        "/api/purchasing/preview-debt-schedule",
        formData
      );
      if (res && res.records && res.records.length > 0) {
        setPreviewData(res);
        setPreviewFile(file);
        setIsPreviewOpen(true);
      } else {
        toast.error("No valid debt schedule records found in the selected file.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse debt schedule preview");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveImport = async (clearExisting: boolean, recordsToSave?: DebtSchedulePreviewRecord[]) => {
    if (!previewData) return;
    try {
      setIsSavingImport(true);
      const formData = new FormData();
      if (previewFile) {
        formData.append("file", previewFile);
      }
      formData.append("clear_existing", clearExisting ? "true" : "false");
      const recordsToSend = recordsToSave || previewData.records;
      if (recordsToSend) {
        formData.append("records_json", JSON.stringify(recordsToSend));
      }

      const res = await apiClient.post<any>("/api/purchasing/import-debt-schedule", formData);
      toast.success(
        `Successfully saved and imported ${res.imported_count || recordsToSend?.length || previewData.total_records} debt schedules!`
      );
      setIsPreviewOpen(false);
      setPreviewData(null);
      setPreviewFile(null);
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchasing"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save debt schedules");
    } finally {
      setIsSavingImport(false);
    }
  };



  // Recurring notification settings query
  const { data: notifSettings, refetch: refetchSettings } = useQuery<RecurringNotificationSettings>({
    queryKey: ["recurring-notification-settings"],
    queryFn: async () => {
      return await apiClient.get<RecurringNotificationSettings>(
        "/api/purchasing/recurring/notification-settings"
      );
    },
  });

  const [settingsForm, setSettingsForm] = useState<RecurringNotificationSettings>({
    enabled: true,
    days_ahead: 7,
    sender_email: "",
    reminder_time: "08:30",
    timezone: "America/New_York",
    include_requester: true,
    include_ap: true,
    include_treasury: true,
    custom_emails: [],
  });

  useEffect(() => {
    if (notifSettings) {
      setSettingsForm({
        ...notifSettings,
        sender_email: notifSettings.sender_email || "",
      });
    }
  }, [notifSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: RecurringNotificationSettings) => {
      return await apiClient.put<RecurringNotificationSettings>(
        "/api/purchasing/recurring/notification-settings",
        payload
      );
    },
    onSuccess: () => {
      toast.success("Notification settings saved");
      setIsSettingsOpen(false);
      refetchSettings();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save settings");
    },
  });

  const testReminderMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post<any>(
        `/api/purchasing/recurring/send-due-reminders?force=true&days_ahead=${settingsForm.days_ahead}${settingsForm.sender_email ? `&sender_email=${encodeURIComponent(settingsForm.sender_email)}` : ""}`,
        {}
      );
    },
    onSuccess: (res: any) => {
      toast.success(`Dispatched reminders for ${res.count || 0} item(s)`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to trigger reminder test");
    },
  });
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [selectedCalendarItem, setSelectedCalendarItem] =
    useState<PurchaseRequest | null>(null);

  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  useEffect(() => {
    const isMaScheduled = cardFilter === "MA_SCHEDULED" || cardFilter === "SCHEDULED";
    document.dispatchEvent(
      new CustomEvent("set-breadcrumb-trail", {
        detail: {
          path: window.location.pathname,
          items: [
            { title: "Scheduled Payments", path: isMaScheduled ? "/purchasing/recurring" : undefined },
            ...(isMaScheduled ? [{ title: "M&A Scheduled Payments" }] : []),
          ],
        },
      })
    );
  }, [cardFilter]);

  // Fetch all RECURRING requests with live polling
  const { data: requests = [], isLoading } = useQuery<PurchaseRequest[]>({
    queryKey: ["recurring-requests"],
    queryFn: async () => {
      return await apiClient.get<PurchaseRequest[]>(
        "/api/purchasing/requests?request_type=RECURRING,SCHEDULED_PAYMENT"
      );
    },
    enabled: !!canAccess,
    refetchOnWindowFocus: true,
    refetchInterval: 3000,
  });

  // Toggle review status mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      review_status,
    }: {
      id: string;
      review_status: string;
    }) => {
      return await apiClient.patch<RequestDetail>(
        `/api/purchasing/requests/${id}/review-status`,
        { review_status }
      );
    },
    onSuccess: (_, variables) => {
      // Optimistically update query cache immediately
      queryClient.setQueryData<PurchaseRequest[]>(["recurring-requests"], (old = []) =>
        old.map((item) =>
          String(item.id) === String(variables.id)
            ? { ...item, review_status: variables.review_status as any }
            : item
        )
      );
      toast.success(
        `Request #${variables.id} marked as ${
          variables.review_status === "REVIEWED" ? "Reviewed" : "Waiting for Review"
        }`
      );
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchasing"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update review status");
    },
  });

  // Helper to generate default 2-installment schedule starting from a base date
  const getInitialDefaultSchedule = (baseDate?: string, amount?: number) => {
    const sDate = baseDate || new Date().toISOString().split("T")[0];
    const nextMonth = new Date(sDate + "T00:00:00");
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthIso = formatDateToIso(nextMonth);
    return {
      is_scheduled: true,
      frequency: "CUSTOM" as FrequencyType,
      start_date: sDate,
      end_date: nextMonthIso,
      schedule_dates: [
        { date: sDate, amount: amount && amount > 0 ? amount : undefined, note: "Installment #1" },
        { date: nextMonthIso, amount: amount && amount > 0 ? amount : undefined, note: "Installment #2" },
      ] as CustomScheduleDate[],
    };
  };

  // Create recurring request state
  const initialSchedule = getInitialDefaultSchedule();
  const [newForm, setNewForm] = useState({
    title: "",
    requester: "",
    department: "",
    amount: "",
    due_date: initialSchedule.start_date,
    description: "",
    gl_code: "",
    priority: "MEDIUM",
    is_scheduled: true,
    frequency: "CUSTOM" as FrequencyType,
    start_date: initialSchedule.start_date,
    end_date: initialSchedule.end_date,
    payment_method: "Wire",
    schedule_dates: initialSchedule.schedule_dates,
  });

  // Edit recurring request form state
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    requester: "",
    department: "",
    amount: "",
    due_date: "",
    description: "",
    gl_code: "",
    priority: "MEDIUM",
    is_scheduled: true,
    frequency: "CUSTOM" as FrequencyType,
    start_date: "",
    end_date: "",
    completed_installments: 0,
    schedule_dates: [] as CustomScheduleDate[],
  });

  const handleOpenCreate = () => {
    const displayName = user?.full_name || user?.email || "";
    const matchedUser = usersList.find(
      (u) =>
        (u.full_name && u.full_name.toLowerCase() === displayName.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === displayName.toLowerCase())
    );
    const defaultDept = matchedUser
      ? resolveUserDepartment(matchedUser, rolesList)
      : resolveUserDepartment(user, rolesList);

    const todayIso = new Date().toISOString().split("T")[0];
    const sched = getInitialDefaultSchedule(todayIso);
    setNewForm({
      title: "",
      requester: displayName,
      department: defaultDept,
      amount: "",
      due_date: todayIso,
      description: "",
      gl_code: "",
      priority: "MEDIUM",
      is_scheduled: true,
      frequency: "CUSTOM",
      start_date: sched.start_date,
      end_date: sched.end_date,
      payment_method: "Wire",
      schedule_dates: sched.schedule_dates,
    });
    setIsCreateOpen(true);
  };


  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post<RequestDetail>(
        "/api/purchasing/requests",
        payload
      );
    },
    onSuccess: (res) => {
      toast.success(`Recurring request #${res.request.id} created successfully`);
      setIsCreateOpen(false);
      const todayIso = new Date().toISOString().split("T")[0];
      const sched = getInitialDefaultSchedule(todayIso);
      setNewForm({
        title: "",
        requester: "",
        department: "",
        amount: "",
        due_date: todayIso,
        description: "",
        gl_code: "",
        priority: "MEDIUM",
        is_scheduled: true,
        frequency: "CUSTOM",
        start_date: sched.start_date,
        end_date: sched.end_date,
        payment_method: "Wire",
        schedule_dates: sched.schedule_dates,
      });
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchasing"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create recurring request");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await apiClient.put<RequestDetail>(
        `/api/purchasing/requests/${id}`,
        payload
      );
    },
    onSuccess: (res) => {
      toast.success(`Recurring request #${res.request.id} updated successfully`);
      handleCloseEdit();
      queryClient.invalidateQueries({ queryKey: ["recurring-requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchasing"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update recurring request");
    },
  });

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingRequest(null);
    if (routeRequestId) {
      navigate("/purchasing/recurring", { replace: true });
    }
  };

  const handleOpenEdit = (req: PurchaseRequest) => {
    setEditingRequest(req);
    let dept = req.department || "";
    if (!dept || dept === "General") {
      const matched = usersList.find(
        (u) =>
          (u.full_name && u.full_name.toLowerCase() === (req.requester || "").toLowerCase()) ||
          (u.email && u.email.toLowerCase() === (req.requester || "").toLowerCase())
      );
      if (matched) {
        dept = resolveUserDepartment(matched, rolesList);
      }
    }
    const sched = req.recurring_schedule;
    const isSched = sched?.is_scheduled !== undefined ? Boolean(sched.is_scheduled) : true;
    let schedDates: CustomScheduleDate[] = [];
    if (sched?.schedule_dates && sched.schedule_dates.length > 0) {
      schedDates = sched.schedule_dates;
    } else if (sched?.custom_dates && sched.custom_dates.length > 0) {
      schedDates = sched.custom_dates.map((d: string, i: number) => ({
        date: d,
        amount: sched?.amount_per_cycle || req.amount,
        note: `Installment #${i + 1}`,
      }));
    } else if (isSched) {
      const baseDate = sched?.start_date ? sched.start_date.split("T")[0] : (req.due_date ? req.due_date.split("T")[0] : new Date().toISOString().split("T")[0]);
      const nextMonth = new Date(baseDate + "T00:00:00");
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthIso = formatDateToIso(nextMonth);
      schedDates = [
        { date: baseDate, amount: req.amount || undefined, note: "Installment #1" },
        { date: nextMonthIso, amount: req.amount || undefined, note: "Installment #2" },
      ];
    }
    setEditForm({
      id: req.id,
      title: req.title || "",
      requester: req.requester || "",
      department: dept,
      amount: req.amount ? req.amount.toString() : "",
      due_date: req.due_date ? req.due_date.split("T")[0] : "",
      description: req.description || "",
      gl_code: req.gl_code || "",
      priority: req.priority || "MEDIUM",
      is_scheduled: isSched,
      frequency: (sched?.frequency as FrequencyType) || "CUSTOM",
      start_date: sched?.start_date ? sched.start_date.split("T")[0] : (schedDates[0]?.date || (req.due_date ? req.due_date.split("T")[0] : "")),
      end_date: sched?.end_date ? sched.end_date.split("T")[0] : (schedDates[schedDates.length - 1]?.date || ""),
      completed_installments: sched?.completed_installments || 0,
      schedule_dates: schedDates,
    });
    setIsEditOpen(true);
  };

  // Auto-open request when navigating to /purchasing/requests/:id
  useEffect(() => {
    if (!routeRequestId) return;
    const found = requests.find((r) => String(r.id) === String(routeRequestId));
    if (found) {
      handleOpenEdit(found);
    } else if (!isLoading) {
      apiClient
        .get<RequestDetail>(`/api/purchasing/requests/${routeRequestId}`)
        .then((res) => {
          if (res?.request) {
            handleOpenEdit(res.request);
          }
        })
        .catch((err) => {
          console.error("Failed to load request #" + routeRequestId, err);
        });
    }
  }, [routeRequestId, requests, isLoading]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!newForm.requester.trim()) {
      toast.error("Please select a requester");
      return;
    }
    if (!newForm.department.trim()) {
      toast.error("Please enter or select a department");
      return;
    }
    const isCustom = newForm.frequency === "CUSTOM";
    const customDates = isCustom ? newForm.schedule_dates : [];
    const isSched = Boolean(
      newForm.is_scheduled &&
      (isCustom ? customDates.length > 0 : newForm.start_date && newForm.end_date)
    );

    const customSum = isCustom ? customDates.reduce((acc, itm) => acc + (itm.amount != null ? itm.amount : 0), 0) : 0;
    let baseAmt = parseFloat(newForm.amount) || 0;

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
        const cycleAmt = customDates[0]?.amount != null && customDates[0].amount > 0
          ? customDates[0].amount
          : (baseAmt > 0 ? baseAmt : (totalCycles > 0 ? Math.round((totalAmt / totalCycles) * 100) / 100 : 0));
        const sanitizedDates = customDates.map((d, i) => ({
          date: d.date,
          amount: d.amount != null && d.amount > 0 ? d.amount : cycleAmt,
          note: d.note || `Installment #${i + 1}`,
        }));

        const effectiveStartDate = sanitizedDates.length > 0 ? sanitizedDates[0].date : newForm.start_date;
        const effectiveEndDate = sanitizedDates.length > 0 ? sanitizedDates[sanitizedDates.length - 1].date : newForm.end_date;
        const effectiveDueDate = effectiveStartDate || newForm.due_date;

        createMutation.mutate({
          title: newForm.title,
          requester: newForm.requester,
          department: newForm.department,
          request_type: "SCHEDULED_PAYMENT",
          priority: newForm.priority,
          payment_method: "Wire",
          amount: cycleAmt,
          unit_price: cycleAmt,
          quantity: 1,
          description: newForm.description,
          gl_code: null,
          due_date: effectiveDueDate || null,
          recurring_schedule: {
            is_scheduled: true,
            frequency: newForm.frequency,
            payment_method: "Wire",
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            total_installments: totalCycles,
            completed_installments: 0,
            amount_per_cycle: cycleAmt,
            total_amount: totalAmt,
            custom_dates: sanitizedDates.map((d) => d.date),
            schedule_dates: sanitizedDates,
          },
        });
        return;
      } else {
        totalCycles = calculateInstallmentsCount(newForm.start_date, newForm.end_date, newForm.frequency);
        totalAmt = totalCycles ? Math.round(amt * totalCycles * 100) / 100 : null;
      }
    }

    const effectiveStartDate = isCustom && customDates.length > 0 ? customDates[0].date : newForm.start_date;
    const effectiveEndDate = isCustom && customDates.length > 0 ? customDates[customDates.length - 1].date : newForm.end_date;
    const effectiveDueDate = (isSched && effectiveStartDate) ? effectiveStartDate : newForm.due_date;

    createMutation.mutate({
      title: newForm.title,
      requester: newForm.requester,
      department: newForm.department,
      request_type: isSched ? "SCHEDULED_PAYMENT" : "RECURRING",
      priority: newForm.priority,
      payment_method: "Wire",
      amount: amt,
      unit_price: amt,
      quantity: 1,
      description: newForm.description,
      gl_code: null,
      due_date: effectiveDueDate || null,
      recurring_schedule: isSched
        ? {
            is_scheduled: true,
            frequency: newForm.frequency,
            payment_method: "Wire",
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            total_installments: totalCycles,
            completed_installments: 0,
            amount_per_cycle: totalCycles && totalCycles > 0 ? Math.round((totalAmt! / totalCycles) * 100) / 100 : amt,
            total_amount: totalAmt,
            custom_dates: isCustom ? customDates.map((d) => d.date) : null,
            schedule_dates: isCustom ? customDates : null,
          }
        : {
            is_scheduled: false,
            frequency: newForm.frequency || "MONTHLY",
            payment_method: "Wire",
            start_date: newForm.due_date || newForm.start_date || new Date().toISOString().split("T")[0],
            end_date: null,
            total_installments: null,
            completed_installments: 0,
            amount_per_cycle: amt,
            total_amount: null,
          },
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!editForm.requester.trim()) {
      toast.error("Please select a requester");
      return;
    }
    if (!editForm.department.trim()) {
      toast.error("Please enter or select a department");
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
          id: editForm.id,
          payload: {
            title: editForm.title,
            requester: editForm.requester,
            department: editForm.department,
            priority: editForm.priority,
            amount: cycleAmt,
            unit_price: cycleAmt,
            quantity: 1,
            description: editForm.description,
            gl_code: editingRequest?.gl_code || editForm.gl_code || null,
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
      id: editForm.id,
      payload: {
        title: editForm.title,
        requester: editForm.requester,
        department: editForm.department,
        priority: editForm.priority,
        amount: amt,
        unit_price: amt,
        quantity: 1,
        description: editForm.description,
        gl_code: editingRequest?.gl_code || editForm.gl_code || null,
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
      },
    });
  };

  // Helper to check if a recurring request is an M&A scheduled payment
  const isScheduledPayment = (r: PurchaseRequest) => {
    return Boolean(
      r.request_type === "SCHEDULED_PAYMENT" ||
      r.recurring_schedule?.is_scheduled ||
      r.recurring_schedule?.frequency === "CUSTOM" ||
      (r.department && (
        r.department.toLowerCase().includes("m&a") ||
        r.department.toLowerCase().includes("merger") ||
        r.department.toLowerCase().includes("acquisition") ||
        r.department.toLowerCase().includes("deal")
      ))
    );
  };

  // Helper to check if a recurring request is due within 7 days
  const isDueSoon = (r: PurchaseRequest) => {
    const dateStr = r.due_date || r.request_date;
    const st = parseRequestStatus(r.status);
    if (!dateStr || st === RequestStatus.Completed || st === RequestStatus.Rejected) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const parsedStatus = parseRequestStatus(r.status);
      const isRejected = parsedStatus === RequestStatus.Rejected;

      if (searchTerm && searchTerm.trim()) {
        const rawTerm = searchTerm.toLowerCase().trim();
        const cleanIdTerm = rawTerm.replace(/^(?:req-#|req-|rec-#|rec-|#)/i, "").trim();
        const idStr = String(r.id ?? "").toLowerCase();
        const titleStr = String(r.title ?? "").toLowerCase();
        const reqStr = String(r.requester ?? "").toLowerCase();
        const deptStr = String(r.department ?? "").toLowerCase();
        const descStr = String(r.description ?? "").toLowerCase();
        const vendorStr = String((r as any).vendor ?? r.product_info?.vendor ?? "").toLowerCase();
        const statusStr = String(r.status ?? "").toLowerCase();
        const amountStr = String(r.amount ?? "");
        const glStr = String(r.gl_code ?? "").toLowerCase();
        const { displayAmount, nextFormatted, totalFormatted } = getRecurringAmounts(
          r.recurring_schedule,
          r.amount,
          r.currency || "USD",
          r.status,
          r.due_date || r.request_date
        );

        const matches =
          idStr.includes(rawTerm) ||
          (cleanIdTerm.length > 0 && idStr.includes(cleanIdTerm)) ||
          titleStr.includes(rawTerm) ||
          reqStr.includes(rawTerm) ||
          deptStr.includes(rawTerm) ||
          descStr.includes(rawTerm) ||
          vendorStr.includes(rawTerm) ||
          statusStr.includes(rawTerm) ||
          amountStr.includes(rawTerm) ||
          displayAmount.toLowerCase().includes(rawTerm) ||
          nextFormatted.toLowerCase().includes(rawTerm) ||
          (totalFormatted && totalFormatted.toLowerCase().includes(rawTerm)) ||
          glStr.includes(rawTerm);

        if (!matches) {
          return false;
        }
      }
      if (cardFilter === "MA_SCHEDULED" || cardFilter === "SCHEDULED") {
        if (isRejected) return false;
        if (!isScheduledPayment(r)) return false;
      } else if (cardFilter === "DUE_SOON") {
        if (!isDueSoon(r)) return false;
      } else if (cardFilter === "WAITING_REVIEW") {
        if (isRejected) return false;
        const rev = r.review_status || "WAITING_FOR_REVIEW";
        if (rev !== "WAITING_FOR_REVIEW") return false;
      } else if (cardFilter === "REVIEWED") {
        if (isRejected) return false;
        if (r.review_status !== "REVIEWED") return false;
      } else if (cardFilter === "REJECTED") {
        if (!isRejected) return false;
      } else if (cardFilter === "ALL") {
        if (isRejected) return false;
      }
      if (reviewFilter !== "ALL") {
        const rev = r.review_status || "WAITING_FOR_REVIEW";
        if (rev !== reviewFilter) return false;
      }
      if (statusFilter !== "ALL") {
        const targetStatus = parseRequestStatus(statusFilter);
        if (parsedStatus !== targetStatus && r.status !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [requests, searchTerm, cardFilter, reviewFilter, statusFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    const activeSubs = requests.filter((r) => parseRequestStatus(r.status) !== RequestStatus.Rejected);
    const total = activeSubs.length;
    const maScheduled = activeSubs.filter(isScheduledPayment).length;
    const dueSoon = requests.filter(isDueSoon).length;
    const waitingReview = activeSubs.filter(
      (r) => (r.review_status || "WAITING_FOR_REVIEW") === "WAITING_FOR_REVIEW"
    ).length;
    const reviewed = activeSubs.filter(
      (r) => r.review_status === "REVIEWED"
    ).length;
    const rejected = requests.filter((r) => parseRequestStatus(r.status) === RequestStatus.Rejected).length;
    const totalAmount = activeSubs.reduce((sum, r) => sum + (r.amount || 0), 0);
    return { total, maScheduled, dueSoon, waitingReview, reviewed, rejected, totalAmount };
  }, [requests]);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          The Recurring Payments dashboard is only accessible to users with the{" "}
          <strong>TREASURY</strong> or <strong>AP (Accounts Payable)</strong>{" "}
          roles.
        </p>
        <Button className="mt-6" onClick={() => navigate("/purchasing/requests")}>
          Return to Purchase Requests
        </Button>
      </div>
    );
  }

  // Calendar calculations
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthName = currentCalendarDate.toLocaleString("default", {
    month: "long",
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonthDays = new Date(year, month, 0).getDate();
  const calendarCells: CalendarCell[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: "",
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${year}-${monthStr}-${dayStr}`,
    });
  }

  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ day: i, isCurrentMonth: false, dateStr: "" });
  }

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Recurring Payments</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
              AP & Treasury
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manage recurring subscriptions, process workflow from New Request → Waiting for Payment → Invoice (Fixed Assets) → Completed, and track AP review statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-slate-200 dark:border-zinc-700">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className={`h-8 gap-1.5 text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/95"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-zinc-700/60"
              }`}
              onClick={() => setViewMode("table")}
            >
              <TableIcon size={14} />
              Subscriptions
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              className={`h-8 gap-1.5 text-xs font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/95"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-zinc-700/60"
              }`}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon size={14} />
              Calendar View
            </Button>
            <Button
              variant={viewMode === "master" ? "default" : "ghost"}
              size="sm"
              className={`h-8 gap-1.5 text-xs font-semibold transition-all ${
                viewMode === "master"
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/95"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-zinc-700/60"
              }`}
              onClick={() => setViewMode("master")}
            >
              <Layers size={14} />
              Master View
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx, .xlsm"
              className="hidden"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="h-9 gap-1.5 border-emerald-600/40 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:border-emerald-600/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40 font-medium"
              title="Import Debt Schedules from Excel (.xlsx/.xlsm)"
            >
              <FileSpreadsheet size={15} />
              <span>{isImporting ? "Importing..." : "Import Debt Schedule"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 gap-1.5 border-slate-300 dark:border-zinc-700 font-medium"
              title="Notification Settings"
            >
              <Settings size={15} />
              <span>Settings</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
            >
              <Plus size={16} />
              New Recurring Request
            </Button>
          </div>
        </div>
      </div>

      {/* Slim Vertical Floating Quick Filter (Follows card colors & appears on scroll) */}
      <FloatingVerticalFilter
        items={[
          {
            key: "ALL",
            label: "All Subscriptions",
            count: stats.total,
            icon: RefreshCw,
            color: "blue",
          },
          {
            key: "MA_SCHEDULED",
            label: "M&A Scheduled",
            count: stats.maScheduled,
            icon: CalendarClock,
            color: "violet",
          },
          {
            key: "DUE_SOON",
            label: "Due in 7 Days",
            count: stats.dueSoon,
            icon: AlertTriangle,
            color: "amber",
          },
          {
            key: "WAITING_REVIEW",
            label: "Waiting Review",
            count: stats.waitingReview,
            icon: Clock,
            color: "amber",
          },
          {
            key: "REVIEWED",
            label: "Reviewed (AP)",
            count: stats.reviewed,
            icon: CheckCircle2,
            color: "sky",
          },
          {
            key: "REJECTED",
            label: "Rejected",
            count: stats.rejected,
            icon: XCircle,
            color: "rose",
          },
        ]}
        activeKey={cardFilter}
        onSelect={handleCardFilterChange}
        defaultKey="ALL"
        onReset={() => handleCardFilterChange("ALL")}
        scrollThreshold={130}
        title="Subscriptions"
        kpiRef={kpiRef}
      />

      {/* Compact Interactive KPI Filter Cards */}
      <div ref={kpiRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 animate-in fade-in duration-300 shrink-0">
        {/* 1. All Subscriptions */}
        <Card
          onClick={() => handleCardFilterChange("ALL")}
          className={`border border-slate-200/80 dark:border-zinc-800 cursor-pointer shadow-xs hover:shadow-xs transition-all rounded-lg hover:border-blue-300 ${
            cardFilter === "ALL" ? "ring-2 ring-blue-500 bg-blue-50/20 dark:bg-blue-950/20" : ""
          }`}
        >
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Active Subscriptions
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight mt-0.5">
                {stats.total}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">All active recurring</p>
            </div>
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 shrink-0">
              <RefreshCw size={16} />
            </div>
          </CardContent>
        </Card>

        {/* 2. M&A Scheduled Payments */}
        <Card
          onClick={() => handleCardFilterChange(cardFilter === "MA_SCHEDULED" ? "ALL" : "MA_SCHEDULED")}
          className={`border border-slate-200/80 dark:border-zinc-800 cursor-pointer shadow-xs hover:shadow-xs transition-all rounded-lg hover:border-indigo-300 ${
            cardFilter === "MA_SCHEDULED" ? "ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20" : ""
          }`}
        >
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                M&A Scheduled
              </p>
              <h3 className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">
                {stats.maScheduled}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Milestone contracts</p>
            </div>
            <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
              <CalendarClock size={16} />
            </div>
          </CardContent>
        </Card>

        {/* 3. Due Within 7 Days Alert Filter Card */}
        <Card
          onClick={() => handleCardFilterChange(cardFilter === "DUE_SOON" ? "ALL" : "DUE_SOON")}
          className={`border cursor-pointer shadow-xs hover:shadow-xs transition-all rounded-lg ${
            stats.dueSoon > 0 ? "border-amber-300/80 dark:border-amber-700/60 bg-amber-50/10" : "border-slate-200/80 dark:border-zinc-800"
          } ${
            cardFilter === "DUE_SOON" ? "ring-2 ring-amber-500 bg-amber-50/30 dark:bg-amber-950/40 border-amber-500" : "hover:border-amber-400"
          }`}
        >
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                Due in 7 Days
              </p>
              <h3 className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
                {stats.dueSoon}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats.dueSoon === 1 ? "1 renewal due soon" : `${stats.dueSoon} renewals due soon`}
              </p>
            </div>
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={16} />
            </div>
          </CardContent>
        </Card>

        {/* 3. Waiting for Review */}
        <Card
          onClick={() => handleCardFilterChange(cardFilter === "WAITING_REVIEW" ? "ALL" : "WAITING_REVIEW")}
          className={`border border-slate-200/80 dark:border-zinc-800 cursor-pointer shadow-xs hover:shadow-xs transition-all rounded-lg hover:border-amber-300 ${
            cardFilter === "WAITING_REVIEW" ? "ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20" : ""
          }`}
        >
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Waiting for Review
              </p>
              <h3 className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
                {stats.waitingReview}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pending AP sign-off</p>
            </div>
            <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={16} />
            </div>
          </CardContent>
        </Card>

        {/* 4. Reviewed (AP Signed-Off) */}
        <Card
          onClick={() => handleCardFilterChange(cardFilter === "REVIEWED" ? "ALL" : "REVIEWED")}
          className={`border border-slate-200/80 dark:border-zinc-800 cursor-pointer shadow-xs hover:shadow-xs transition-all rounded-lg hover:border-sky-300 ${
            cardFilter === "REVIEWED" ? "ring-2 ring-sky-500 bg-sky-50/20 dark:bg-sky-950/20" : ""
          }`}
        >
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Reviewed (AP)
              </p>
              <h3 className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 leading-tight mt-0.5">
                {stats.reviewed}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">AP validated</p>
            </div>
            <div className="p-1.5 rounded-md bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </CardContent>
        </Card>

        {/* 5. Rejected */}
        <Card
          onClick={() => handleCardFilterChange(cardFilter === "REJECTED" ? "ALL" : "REJECTED")}
          className={`border border-slate-200/80 dark:border-zinc-800 cursor-pointer shadow-xs hover:shadow-xs transition-all rounded-lg hover:border-rose-300 ${
            cardFilter === "REJECTED" ? "ring-2 ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20" : ""
          }`}
        >
          <CardContent className="p-2 sm:p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Rejected
              </p>
              <h3 className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 leading-tight mt-0.5">
                {stats.rejected}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Rejected subscriptions</p>
            </div>
            <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 shrink-0">
              <XCircle size={16} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search recurring payments by title, requester, department, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={reviewFilter} onValueChange={setReviewFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Review Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Review States</SelectItem>
              <SelectItem value="WAITING_FOR_REVIEW">Waiting for Review</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Workflow Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Workflow Statuses</SelectItem>
              <SelectItem value="INITIAL">Draft</SelectItem>
              <SelectItem value="WAITING_PAYMENT">Waiting Payment</SelectItem>
              <SelectItem value="INVOICE_RECEIVED">Invoice Received</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

            {/* Main View: Master, Table, or Calendar */}
      {viewMode === "master" ? (
        <MasterTransactionsTable
          requests={filteredRequests}
          isLoading={isLoading}
          isAP={isAP}
          isSuperAdmin={isSuperAdmin}
          onOpenBreakdownModal={(req) => setScheduleModalRequest(req)}
          onToggleReviewStatus={(req) => {
            const revStatus = req.review_status || "WAITING_FOR_REVIEW";
            const isRev = revStatus === "REVIEWED";
            reviewMutation.mutate({
              id: req.id,
              review_status: isRev ? "WAITING_FOR_REVIEW" : "REVIEWED",
            });
          }}
          reviewMutationPending={reviewMutation.isPending}
        />
      ) : viewMode === "table" ? (
        <Card className="border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xs bg-white dark:bg-zinc-900 overflow-hidden flex flex-col max-h-[calc(100vh-210px)] min-h-[350px]">
          <div className="flex-1 min-h-0 overflow-auto relative">
            <Table containerClassName="overflow-visible">
            <TableHeader >
              <TableRow className="bg-slate-50/50 dark:bg-zinc-900/50">
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Title / Description</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Next Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Workflow Status</TableHead>
                <TableHead>AP Review Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Loading recurring payments...
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No recurring payments found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => {
                  const revStatus = req.review_status || "WAITING_FOR_REVIEW";
                  const isRev = revStatus === "REVIEWED";
                  const { nextFormatted, totalFormatted } = getRecurringAmounts(
                    req.recurring_schedule,
                    req.amount,
                    req.currency || "USD",
                    req.status,
                    req.due_date || req.request_date
                  );
                  return (
                    <TableRow
                      key={req.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/purchasing/requests/${req.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        #{req.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400 text-sm transition-colors">
                          {req.title}
                        </div>
                        {req.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {req.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{req.requester}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.department}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{req.due_date ? formatDate(req.due_date) : formatDate(req.request_date)}</span>
                          {(() => {
                            const due = getDueStatus(req.due_date || req.request_date, req.status);
                            if (!due) return null;
                            return (
                              <Badge variant={due.variant} className={`text-[10px] py-0 px-1.5 leading-tight ${due.className}`}>
                                {due.label}
                              </Badge>
                            );
                          })()}
                          {req.recurring_schedule?.is_scheduled && (
                            <div className="flex flex-col gap-1 mt-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0.5 px-1.5 bg-indigo-50/90 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1 font-semibold"
                              >
                                <Clock className="h-2.5 w-2.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                                {formatRemainingDuration(req.recurring_schedule.end_date).text}
                              </Badge>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleModalRequest(req);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold underline text-left flex items-center gap-1 cursor-pointer"
                              >
                                <TableIcon className="h-2.5 w-2.5 shrink-0" />
                                Schedule ({req.recurring_schedule.total_installments ? `${req.recurring_schedule.completed_installments || 0}/${req.recurring_schedule.total_installments}` : `${req.recurring_schedule.completed_installments || 0} Settled`})
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1 font-bold text-slate-900 dark:text-zinc-100">
                            <span>{nextFormatted}</span>
                            {totalFormatted && (
                              <span className="text-xs font-semibold text-muted-foreground">
                                / {totalFormatted}
                              </span>
                            )}
                          </div>
                          {totalFormatted && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              Next / Total
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadge(req.status)}>
                          {getStatusLabel(req.status)}
                          {req.recurring_schedule ? (
                            parseRequestStatus(req.status) === RequestStatus.Completed
                              ? (req.recurring_schedule.total_installments ? ` (${req.recurring_schedule.total_installments}/${req.recurring_schedule.total_installments} Cycles)` : "")
                              : (req.recurring_schedule.total_installments
                                ? ` (Cycle ${Math.min((req.recurring_schedule.completed_installments || 0) + 1, req.recurring_schedule.total_installments)}/${req.recurring_schedule.total_installments})`
                                : ` (Cycle ${(req.recurring_schedule.completed_installments || 0) + 1})`)
                          ) : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAP || isSuperAdmin ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewMutation.mutate({
                                id: req.id,
                                review_status: isRev ? "WAITING_FOR_REVIEW" : "REVIEWED",
                              });
                            }}
                            disabled={reviewMutation.isPending}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:opacity-80 ${
                              isRev
                                ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
                                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            }`}
                            title="Click to toggle Review Status"
                          >
                            {isRev ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                            {isRev ? "Reviewed" : "Waiting for Review"}
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
                            {isRev ? "Reviewed" : "Waiting for Review"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {req.recurring_schedule?.is_scheduled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="View Full Payment Schedule / Ledger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleModalRequest(req);
                              }}
                            >
                              <CalendarClock size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            title="Edit Recurring Request"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(req);
                            }}
                          >
                            <Edit2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        /* Calendar View */
        <Card className="border border-slate-200 dark:border-zinc-800 p-6">
          {/* Calendar Month Header & Legend */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                {monthName} {year}
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-semibold"
                onClick={() => setCurrentCalendarDate(new Date())}
              >
                Today
              </Button>
            </div>

            {/* Legend & Navigation */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 text-xs text-muted-foreground mr-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span>Reviewed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Waiting Review</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentCalendarDate(new Date(year, month - 1, 1))
                  }
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentCalendarDate(new Date(year, month + 1, 1))
                  }
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Sun</div>
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Mon</div>
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Tue</div>
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Wed</div>
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Thu</div>
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Fri</div>
            <div className="py-1 bg-slate-50 dark:bg-zinc-800/60 rounded">Sat</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell: CalendarCell, idx: number) => {
              // Find items matching this date, including projected installments from scheduled requests
              const cellItems: Array<{
                id: string;
                request: PurchaseRequest;
                installmentNumber?: number;
                totalInstallments?: number;
                isProjected: boolean;
                isPaid: boolean;
                amount: number;
                displayTitle: string;
                isReviewed: boolean;
              }> = [];

              if (cell.isCurrentMonth) {
                filteredRequests.forEach((req) => {
                  const sched = req.recurring_schedule;
                  const installments = generatePaymentSchedule(
                    sched,
                    req.amount || 0,
                    req.currency || "USD",
                    req.status,
                    req.due_date || req.request_date
                  );
                  const match = installments.find((inst) => inst.dueDate === cell.dateStr);
                  if (match) {
                    const totalInst = sched?.total_installments || installments.length;
                    cellItems.push({
                      id: `${req.id}-inst-${match.installmentNumber}`,
                      request: req,
                      installmentNumber: match.installmentNumber,
                      totalInstallments: totalInst,
                      isProjected: match.status === "PROJECTED",
                      isPaid: match.status === "PAID",
                      amount: match.amount,
                      displayTitle: `${req.title} (#${match.installmentNumber}/${totalInst})`,
                      isReviewed: req.review_status === "REVIEWED",
                    });
                  } else if (!installments || installments.length === 0) {
                    const dStr = String(req.due_date || req.request_date || "").split("T")[0];
                    if (dStr === cell.dateStr) {
                      cellItems.push({
                        id: `${req.id}-standard`,
                        request: req,
                        isProjected: false,
                        isPaid: parseRequestStatus(req.status) === RequestStatus.Completed,
                        amount: req.amount,
                        displayTitle: req.title,
                        isReviewed: req.review_status === "REVIEWED",
                      });
                    }
                  }
                });
              }

              const todayStr = new Date().toISOString().split("T")[0];
              const isToday = cell.isCurrentMonth && todayStr === cell.dateStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 rounded-lg border transition-all flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? isToday
                        ? "bg-sky-50/20 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 ring-1 ring-sky-400/50"
                        : "bg-card border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                      : "bg-slate-50/40 dark:bg-zinc-900/20 border-transparent text-slate-400 opacity-40 select-none"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "bg-sky-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-xs"
                          : "text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {cellItems.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                        {cellItems.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-1 flex-1 overflow-y-auto max-h-[90px] scrollbar-hide">
                    {cellItems.map((item) => {
                      const isItemReviewed = item.isReviewed;
                      if (item.isProjected) {
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedCalendarItem(item.request);
                              setSelectedCalendarInstallment({
                                installmentNumber: item.installmentNumber,
                                totalInstallments: item.totalInstallments,
                                amount: item.amount,
                                dueDate: cell.dateStr,
                                isProjected: true,
                                isPaid: false,
                              });
                            }}
                            className="w-full text-left p-1.5 rounded-md text-[11px] font-medium border shadow-2xs transition-all hover:scale-[1.02] cursor-pointer bg-slate-50/90 text-slate-800 border-dashed border-indigo-300 dark:bg-zinc-800/60 dark:text-zinc-200 dark:border-indigo-700/60"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-medium text-slate-800 dark:text-zinc-200">
                                {item.displayTitle}
                              </span>
                              <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
                                Proj
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 mt-0.5">
                              {formatMoney(item.amount)}
                            </div>
                          </button>
                        );
                      }

                      if (item.isPaid) {
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedCalendarItem(item.request);
                              setSelectedCalendarInstallment({
                                installmentNumber: item.installmentNumber,
                                totalInstallments: item.totalInstallments,
                                amount: item.amount,
                                dueDate: cell.dateStr,
                                isProjected: false,
                                isPaid: true,
                              });
                            }}
                            className="w-full text-left p-1.5 rounded-md text-[11px] font-medium border shadow-2xs transition-all hover:scale-[1.02] cursor-pointer bg-emerald-50/90 text-emerald-950 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/80"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-semibold text-emerald-950 dark:text-emerald-100">
                                {item.displayTitle}
                              </span>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            </div>
                            <div className="text-[10px] font-bold opacity-85 mt-0.5">
                              {formatMoney(item.amount)}
                            </div>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedCalendarItem(item.request);
                            setSelectedCalendarInstallment({
                              installmentNumber: item.installmentNumber,
                              totalInstallments: item.totalInstallments,
                              amount: item.amount,
                              dueDate: cell.dateStr,
                              isProjected: false,
                              isPaid: false,
                            });
                          }}
                          className={`w-full text-left p-1.5 rounded-md text-[11px] font-medium border shadow-2xs transition-all hover:scale-[1.02] cursor-pointer ${
                            isItemReviewed
                              ? "bg-sky-50/90 text-sky-950 border-sky-200/90 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/80"
                              : "bg-amber-50/90 text-amber-950 border-amber-200/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-semibold text-slate-900 dark:text-zinc-100">
                              {item.displayTitle}
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isItemReviewed ? "bg-sky-500" : "bg-amber-500"
                              }`}
                            />
                          </div>
                          <div className="text-[10px] font-bold opacity-85 mt-0.5">
                            {formatMoney(item.amount)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Calendar Item Quick Preview Modal */}
      {selectedCalendarItem && (
        <Dialog
          open={!!selectedCalendarItem}
          onOpenChange={(open) => !open && setSelectedCalendarItem(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  #{selectedCalendarItem.id}
                </span>
                <Badge
                  variant="outline"
                  className={getStatusBadge(selectedCalendarItem.status)}
                >
                  {getStatusLabel(selectedCalendarItem.status)}
                  {selectedCalendarItem.recurring_schedule ? (
                    parseRequestStatus(selectedCalendarItem.status) === RequestStatus.Completed
                      ? (selectedCalendarItem.recurring_schedule.total_installments ? ` (${selectedCalendarItem.recurring_schedule.total_installments}/${selectedCalendarItem.recurring_schedule.total_installments} Cycles)` : "")
                      : (selectedCalendarItem.recurring_schedule.total_installments
                        ? ` (Cycle ${Math.min((selectedCalendarItem.recurring_schedule.completed_installments || 0) + 1, selectedCalendarItem.recurring_schedule.total_installments)}/${selectedCalendarItem.recurring_schedule.total_installments})`
                        : ` (Cycle ${(selectedCalendarItem.recurring_schedule.completed_installments || 0) + 1})`)
                  ) : ""}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold mt-1">
                {selectedCalendarItem.title}
              </DialogTitle>
              <DialogDescription>
                Recurring subscription item details and review status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 border-y text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  {formatMoney(selectedCalendarItem.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Due Date:</span>
                <span className="font-medium">
                  {selectedCalendarItem.due_date
                    ? formatDate(selectedCalendarItem.due_date)
                    : formatDate(selectedCalendarItem.request_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requester:</span>
                <span className="font-medium">{selectedCalendarItem.requester}</span>
              </div>
              {selectedCalendarItem.recurring_schedule?.is_scheduled && (
                <>
                  <div className="flex justify-between items-center bg-indigo-50/60 dark:bg-indigo-950/30 p-2 rounded border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-indigo-900 dark:text-indigo-200 font-medium">Schedule Horizon:</span>
                    <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-200 font-semibold">
                      {formatRemainingDuration(selectedCalendarItem.recurring_schedule.end_date).text}
                    </Badge>
                  </div>
                  {selectedCalendarInstallment?.installmentNumber && (
                    <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                      <span>Milestone Cycle:</span>
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">
                        Installment #{selectedCalendarInstallment.installmentNumber} of {selectedCalendarInstallment.totalInstallments || selectedCalendarItem.recurring_schedule.total_installments}
                        {selectedCalendarInstallment.isProjected ? " (Projected)" : selectedCalendarInstallment.isPaid ? " (Settled)" : " (Current)"}
                      </span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 text-xs cursor-pointer"
                    onClick={() => {
                      setScheduleModalRequest(selectedCalendarItem);
                    }}
                  >
                    <CalendarClock className="h-3.5 w-3.5 mr-1" />
                    View Full Payment Schedule / Ledger
                  </Button>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span>{selectedCalendarItem.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  {selectedCalendarItem.payment_method || (selectedCalendarItem.recurring_schedule as any)?.payment_method || "Wire"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Review Status:</span>
                <Badge
                  variant="outline"
                  className={
                    selectedCalendarItem.review_status === "REVIEWED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }
                >
                  {selectedCalendarItem.review_status === "REVIEWED"
                    ? "Reviewed"
                    : "Waiting for Review"}
                </Badge>
              </div>
              {selectedCalendarItem.description && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Description:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 mt-1 bg-slate-50 dark:bg-zinc-800 p-2 rounded">
                    {selectedCalendarItem.description}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const itm = selectedCalendarItem;
                  setSelectedCalendarItem(null);
                  handleOpenEdit(itm);
                }}
              >
                Edit Request
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/purchasing/requests/${selectedCalendarItem.id}`)
                }
              >
                Open Full Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Recurring Request Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1440px] 2xl:max-w-[1600px] max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-2xl">
          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs shrink-0">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                    Create Recurring Payment Request
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Add a new recurring software license, subscription, or lease with automated or custom milestone installments.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 py-2">
              {/* Left Column: General Request Details */}
              <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Title / Service Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. AWS Cloud Infrastructure, Zoom Enterprise"
                    value={newForm.title}
                    onChange={(e) =>
                      setNewForm({ ...newForm, title: e.target.value })
                    }
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
                      {newForm.is_scheduled && (
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
                        placeholder="0.00"
                        value={
                          newForm.is_scheduled && newForm.frequency === "CUSTOM" && newForm.schedule_dates.length > 0
                            ? (newForm.schedule_dates.reduce((acc, itm) => acc + (itm.amount != null ? itm.amount : 0), 0) || "").toString()
                            : newForm.amount
                        }
                        onChange={(e) =>
                          setNewForm({ ...newForm, amount: e.target.value })
                        }
                        disabled={newForm.is_scheduled}
                        className="h-10 text-sm font-mono pl-7 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
                        required={!newForm.is_scheduled}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Next Due Date</label>
                      {newForm.is_scheduled && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          (Managed by Schedule)
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={
                        newForm.is_scheduled && newForm.frequency === "CUSTOM" && newForm.schedule_dates.length > 0
                          ? (newForm.schedule_dates[0]?.date || newForm.due_date)
                          : newForm.due_date
                      }
                      onChange={(e) =>
                        setNewForm({ ...newForm, due_date: e.target.value })
                      }
                      disabled={newForm.is_scheduled}
                      className="h-10 text-sm disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <RequesterAutocomplete
                    required
                    value={newForm.requester}
                    onChange={(val) => {
                      const matched = usersList.find(
                        (u) =>
                          (u.full_name && u.full_name.toLowerCase() === val.toLowerCase().trim()) ||
                          (u.email && u.email.toLowerCase() === val.toLowerCase().trim())
                      );
                      const dept = matched ? resolveUserDepartment(matched, rolesList) : "";
                      setNewForm((prev) => ({ ...prev, requester: val, department: dept || prev.department }));
                    }}
                    onSelectUser={(selectedUser) => {
                      const dept = resolveUserDepartment(selectedUser, rolesList);
                      if (dept) {
                        setNewForm((prev) => ({ ...prev, department: dept }));
                      }
                    }}
                    users={usersList}
                    roles={rolesList}
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newForm.department}
                      onChange={(e) =>
                        setNewForm({ ...newForm, department: e.target.value })
                      }
                      placeholder="e.g. Finance"
                      className="h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Description / Terms</label>
                  <textarea
                    className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2.5 flex-1 min-h-[95px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    placeholder="Monthly billing schedule, renewal terms, invoice reference..."
                    value={newForm.description}
                    onChange={(e) =>
                      setNewForm({ ...newForm, description: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Right Column: Schedule Dates Builder */}
              <div className="lg:col-span-6 flex flex-col h-full">
                <ScheduleDatesBuilder
                  isScheduled={newForm.is_scheduled}
                  onIsScheduledChange={(val) => setNewForm((p) => ({ ...p, is_scheduled: val }))}
                  frequency={newForm.frequency}
                  onFrequencyChange={(val) => setNewForm((p) => ({ ...p, frequency: val }))}
                  startDate={newForm.start_date}
                  onStartDateChange={(val) => setNewForm((p) => ({ ...p, start_date: val }))}
                  endDate={newForm.end_date}
                  onEndDateChange={(val) => setNewForm((p) => ({ ...p, end_date: val }))}
                  scheduleDates={newForm.schedule_dates}
                  onScheduleDatesChange={(dates) => setNewForm((p) => ({ ...p, schedule_dates: dates }))}
                  baseAmount={parseFloat(newForm.amount) || 0}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5">
                {createMutation.isPending ? "Creating..." : "Create Recurring Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Recurring Request Modal */}
      {isEditOpen && editingRequest && (
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          if (!open) {
            handleCloseEdit();
          }
        }}>
          <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1440px] 2xl:max-w-[1600px] max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-2xl">
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs shrink-0">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                      Edit Recurring Request #{editForm.id}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Update recurring terms, billing dates, or individual milestones.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 py-2">
                {/* Left Column: General Request Details */}
                <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Title / Service Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
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
                          onChange={(e) =>
                            setEditForm({ ...editForm, amount: e.target.value })
                          }
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
                        onChange={(e) =>
                          setEditForm({ ...editForm, due_date: e.target.value })
                        }
                        disabled={editForm.is_scheduled}
                        className="h-10 text-sm disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <RequesterAutocomplete
                      required
                      value={editForm.requester}
                      onChange={(val) => {
                        const matched = usersList.find(
                          (u) =>
                            (u.full_name && u.full_name.toLowerCase() === val.toLowerCase().trim()) ||
                            (u.email && u.email.toLowerCase() === val.toLowerCase().trim())
                        );
                        const dept = matched ? resolveUserDepartment(matched, rolesList) : "";
                        setEditForm((prev) => ({ ...prev, requester: val, department: dept || prev.department }));
                      }}
                      onSelectUser={(selectedUser) => {
                        const dept = resolveUserDepartment(selectedUser, rolesList);
                        if (dept) {
                          setEditForm((prev) => ({ ...prev, department: dept }));
                        }
                      }}
                      users={usersList}
                      roles={rolesList}
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editForm.department}
                        onChange={(e) =>
                          setEditForm({ ...editForm, department: e.target.value })
                        }
                        placeholder="e.g. Finance"
                        className="h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Description / Terms</label>
                    <textarea
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2.5 flex-1 min-h-[95px] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="Monthly billing schedule, renewal terms, invoice reference..."
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                >
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
      {/* Recurring Notification Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-sky-600" />
              Recurring Due Date Notification Settings
            </DialogTitle>
            <DialogDescription>
              Configure automated email reminders sent prior to upcoming recurring payment due dates.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingsMutation.mutate(settingsForm);
            }}
            className="space-y-4 py-2"
          >
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3.5 border rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800">
              <div>
                <span className="font-semibold text-sm text-slate-900 dark:text-zinc-100">
                  Enable Scheduled Email Reminders
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically emails notice before recurring items reach their due date.
                </p>
              </div>
              <Checkbox
                checked={settingsForm.enabled}
                onCheckedChange={(checked) =>
                  setSettingsForm({ ...settingsForm, enabled: !!checked })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Days Notice Ahead
                </label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={settingsForm.days_ahead}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      days_ahead: parseInt(e.target.value) || 7,
                    })
                  }
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  e.g. 7 days (1 week ahead notice)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Daily Check Time
                </label>
                <Input
                  type="time"
                  value={settingsForm.reminder_time}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      reminder_time: e.target.value,
                    })
                  }
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Automated background trigger time
                </p>
              </div>
            </div>

            

            {/* Test Trigger Button */}
            <div className="pt-2 border-t flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                onClick={() => testReminderMutation.mutate()}
                disabled={testReminderMutation.isPending}
              >
                <Send size={13} />
                {testReminderMutation.isPending ? "Sending Test..." : "Test Reminders Now"}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Schedule Breakdown Ledger Modal */}
      <ScheduleBreakdownModal
        request={scheduleModalRequest}
        open={!!scheduleModalRequest}
        onOpenChange={(open) => !open && setScheduleModalRequest(null)}
        onEditRequest={(req) => {
          setScheduleModalRequest(null);
          handleOpenEdit(req);
        }}
      />

      {/* Debt Schedule Import Preview Modal */}
      <DebtSchedulePreviewModal
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewData(null);
            setPreviewFile(null);
          }
        }}
        previewData={previewData}
        fileName={previewFile?.name}
        onSave={handleSaveImport}
        isSaving={isSavingImport}
      />
    </div>
  );
}
