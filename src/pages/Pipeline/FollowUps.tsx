import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { Download } from "lucide-react";
import { formatNameWithInitial } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { usePipelineTasks, useBackfillFollowUpDates, useAnalysts, type PipelineTask } from "@/hooks/usePipeline";
import TaskDetailPanel from "./TaskDetailPanel";
import TaskFormModal from "./TaskFormModal";
import FollowUpCalendar from "./FollowUpCalendar";
import { FollowUpActions } from "./FollowUpActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { differenceInCalendarDays, format, startOfDay, startOfMonth } from "date-fns";
import {
  AlertTriangle,
  CalendarSearch,
  CircleCheck,
  Clock3,
  Loader2,
  Pencil,
  Search,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DUE_WINDOW_DAYS,
  STATUS_ACCENT,
  STATUS_LABEL,
  STATUS_PILL,
  STATUS_RING,
  followUpDayKey,
  followUpStatus,
  parseFollowUpDay,
  type FollowUpStatus,
} from "./followUpStatus";

const ALL_ANALYSTS = "__all__";
const UNASSIGNED = "__unassigned__";

export default function FollowUps() {
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [analystId, setAnalystId] = useState(ALL_ANALYSTS);
  const [status, setStatus] = useState<FollowUpStatus | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dayInPopup, setDayInPopup] = useState<Date | null>(null);

  const { data: tasks, isLoading } = usePipelineTasks();
  const { data: analysts } = useAnalysts();
  const { mutate: backfillFromNotes, isPending: isBackfilling } = useBackfillFollowUpDates();
  const hasAutoBackfilled = useRef(false);

  const selectedTaskData = tasks?.find(t => t.id === selectedTask?.id) || selectedTask;

  const tasksWithFollowUp = useMemo(
    () => (tasks ?? []).filter(t => t.follow_up_date).length,
    [tasks]
  );

  useEffect(() => {
    if (hasAutoBackfilled.current || isLoading || !tasks) return;
    if (tasksWithFollowUp > 0) return;

    hasAutoBackfilled.current = true;
    backfillFromNotes(undefined, {
      onSuccess: (result) => {
        if (result.updated_count > 0) {
          toast.success(`Imported ${result.updated_count} follow-up date${result.updated_count === 1 ? "" : "s"} from notes.`);
        }
      },
      onError: () => {
        toast.error("Could not scan notes for follow-up dates.");
      },
    });
  }, [backfillFromNotes, isLoading, tasks, tasksWithFollowUp]);

  /** Analysts offered as filters, keyed by id. The endpoint already excludes super
   *  admins and inactive users, so this is exactly the set of real, current analysts. */
  const selectableAnalysts = useMemo(
    () => new Map(
      (analysts ?? []).map(a => [a.id, a.full_name || a.email || "Unnamed analyst"])
    ),
    [analysts]
  );

  /** Which filter bucket a follow-up belongs to.
   *
   *  A task counts as unassigned when nobody selectable owns it - either analyst_id is
   *  empty, or it points at someone the analysts endpoint leaves out (a super admin, or
   *  a user since deactivated). Admins are not analysts, so a follow-up parked on one
   *  has nobody actionable on it and belongs with the unassigned work.
   *
   *  Both the dropdown and the filter derive from this one function on purpose: when
   *  they each decided ownership separately, an owner missing from the endpoint produced
   *  no option and was counted in no bucket, leaving those follow-ups reachable only
   *  through "All analysts". */
  const ownerKey = useCallback(
    (task: PipelineTask) =>
      task.analyst_id && selectableAnalysts.has(task.analyst_id)
        ? task.analyst_id
        : UNASSIGNED,
    [selectableAnalysts]
  );

  const analystOptions = useMemo(() => {
    const seen = new Map<string, string>();
    let unassigned = 0;

    (tasks ?? []).forEach(task => {
      if (!task.follow_up_date) return;
      const key = ownerKey(task);
      if (key === UNASSIGNED) {
        unassigned += 1;
        return;
      }
      seen.set(key, selectableAnalysts.get(key)!);
    });

    const options = Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    if (unassigned > 0) options.push({ value: UNASSIGNED, label: "Unassigned" });
    return options;
  }, [ownerKey, selectableAnalysts, tasks]);

  const term = search.trim().toLowerCase();

  /** Follow-ups in scope: owner + search applied. Drives the counts, banner and calendar. */
  const scopedTasks = useMemo(() => {
    return (tasks ?? []).filter(task => {
      if (!task.follow_up_date) return false;

      if (analystId !== ALL_ANALYSTS && ownerKey(task) !== analystId) return false;

      if (!term) return true;
      return [
        task.company_name,
        task.name,
        task.analyst_name,
        task.industry_name,
        task.location,
        task.country_name,
      ].some(field => field?.toLowerCase().includes(term));
    });
  }, [analystId, ownerKey, tasks, term]);

  // Bucket the in-scope follow-ups by how urgent they are.
  const buckets = useMemo(() => {
    const result: Record<FollowUpStatus, PipelineTask[]> = { pastDue: [], dueThisWeek: [], onTrack: [] };

    const today = startOfDay(new Date());
    scopedTasks.forEach(task => {
      const bucket = followUpStatus(task, today);
      if (bucket) result[bucket].push(task);
    });

    const byDate = (a: PipelineTask, b: PipelineTask) =>
      (followUpDayKey(a) ?? "").localeCompare(followUpDayKey(b) ?? "");
    result.pastDue.sort(byDate);
    result.dueThisWeek.sort(byDate);
    result.onTrack.sort(byDate);

    return result;
  }, [scopedTasks]);

  /** Tasks the calendar renders: the scope, narrowed to one status card if one is active. */
  const visibleTasks = useMemo(
    () =>
      status
        ? buckets[status]
        : [...buckets.pastDue, ...buckets.dueThisWeek, ...buckets.onTrack],
    [buckets, status]
  );

  const popupTasks = useMemo(() => {
    if (!dayInPopup) return [];
    const key = format(dayInPopup, "yyyy-MM-dd");
    return visibleTasks.filter(task => followUpDayKey(task) === key);
  }, [dayInPopup, visibleTasks]);

  const oldestOverdueDays = useMemo(() => {
    const first = buckets.pastDue[0] && parseFollowUpDay(buckets.pastDue[0]);
    return first ? differenceInCalendarDays(startOfDay(new Date()), first) : 0;
  }, [buckets.pastDue]);

  const nextDueDays = useMemo(() => {
    const first = buckets.dueThisWeek[0] && parseFollowUpDay(buckets.dueThisWeek[0]);
    return first ? differenceInCalendarDays(first, startOfDay(new Date())) : null;
  }, [buckets.dueThisWeek]);

  const hasFilters = Boolean(search || status || analystId !== ALL_ANALYSTS);

  const clearFilters = () => {
    setSearch("");
    setStatus(null);
    setAnalystId(ALL_ANALYSTS);
  };


  const handleExportFollowUps = () => {
    try {
      const dataToExport = visibleTasks || tasks || [];
      const cols: ExportColumn<PipelineTask>[] = [
        { header: "Company Name", accessor: (r) => r.company_name || "" },
        { header: "Contact Name", accessor: (r) => r.name || "" },
        { header: "Email", accessor: (r) => r.email || "" },
        { header: "Phone", accessor: (r) => r.phone || "" },
        { header: "Follow-up Date", accessor: (r) => r.follow_up_date || "" },
        { header: "Assigned Analyst", accessor: (r) => r.analyst_name || "" },
        { header: "Priority", accessor: (r) => r.priority_name || "" },
        { header: "Industry", accessor: (r) => r.industry_name || "" },
        { header: "Location", accessor: (r) => [r.state_name || r.state_code, r.country_name || r.country_code].filter(Boolean).join(", ") },
        { header: "Latest Note", accessor: (r) => r.latest_note || "" },
      ];
      exportToCsv(dataToExport, cols, "pipeline_follow_ups");
      toast.success("Follow-ups exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export follow-ups");
    }
  };

  const openTask = (task: PipelineTask) => {
    setDayInPopup(null);
    setSelectedTask(task);
  };

  const handleEdit = (task: PipelineTask) => {
    setDayInPopup(null);
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const runScanNotes = () => {
    backfillFromNotes(undefined, {
      onSuccess: (result) => {
        if (result.updated_count > 0) {
          toast.success(`Imported ${result.updated_count} follow-up date${result.updated_count === 1 ? "" : "s"} from notes.`);
        } else {
          toast.message("No new follow-up dates found in notes.");
        }
      },
      onError: () => toast.error("Could not scan notes for follow-up dates."),
    });
  };

  const statusCards: Array<{
    key: FollowUpStatus;
    count: number;
    caption: string;
    icon: typeof AlertTriangle;
  }> = [
    {
      key: "pastDue",
      count: buckets.pastDue.length,
      caption: buckets.pastDue.length
        ? `Oldest ${oldestOverdueDays} day${oldestOverdueDays === 1 ? "" : "s"} overdue`
        : "Nothing overdue",
      icon: AlertTriangle,
    },
    {
      key: "dueThisWeek",
      count: buckets.dueThisWeek.length,
      caption:
        nextDueDays === null
          ? `Clear for ${DUE_WINDOW_DAYS} days`
          : nextDueDays === 0
            ? "Due today"
            : `Within ${nextDueDays} day${nextDueDays === 1 ? "" : "s"}`,
      icon: Clock3,
    },
    {
      key: "onTrack",
      count: buckets.onTrack.length,
      caption: `Beyond the ${DUE_WINDOW_DAYS}-day window`,
      icon: CircleCheck,
    },
  ];

  const overdueNames = buckets.pastDue.slice(0, 3);
  const overdueRest = buckets.pastDue.length - overdueNames.length;

  return (
    <div className="h-full flex flex-col w-full animate-in fade-in duration-500 min-h-0 bg-background">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b bg-card shrink-0 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Follow-ups</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Search and filter your follow-ups.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0 h-8.5 sm:h-9 text-xs"
          disabled={isBackfilling}
          onClick={runScanNotes}
        >
          {isBackfilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarSearch className="h-3.5 w-3.5" />}
          Scan notes
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2.5 sm:p-4 md:p-5 space-y-4 bg-muted/20 min-h-0">
        {/* Search */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b pb-4">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9 h-8.5 sm:h-9 text-xs sm:text-sm"
              placeholder="Search company, contact, or analyst..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={analystId} onValueChange={setAnalystId}>
            <SelectTrigger className="w-[180px] sm:w-[220px] h-8.5 sm:h-9 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="All analysts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ANALYSTS}>All analysts</SelectItem>
              {analystOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportFollowUps}
            className="h-8.5 sm:h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 h-8.5 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Past due banner */}
        {buckets.pastDue.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4 dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm text-red-700 dark:text-red-300">
                  {buckets.pastDue.length} follow-up{buckets.pastDue.length === 1 ? " is" : "s are"} past due
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {overdueNames.map((task, i) => (
                    <span key={task.id}>
                      {i > 0 && ", "}
                      <button
                        className="underline-offset-2 hover:underline text-foreground/80 font-medium"
                        onClick={() => openTask(task)}
                      >
                        {task.company_name}
                      </button>
                    </span>
                  ))}
                  {overdueRest > 0 && ` and ${overdueRest} more`}
                  {" — contact today to stay inside the weekly cadence."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {statusCards.map(({ key, count, caption, icon: Icon }) => (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-pressed={status === key}
              className={`cursor-pointer rounded-lg border bg-card p-3 sm:p-4 transition hover:shadow-xs ${
                status === key ? STATUS_RING[key] : ""
              }`}
              onClick={() => setStatus(prev => (prev === key ? null : key))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setStatus(prev => (prev === key ? null : key));
                }
              }}
            >
              <div className={`flex items-center gap-1.5 ${STATUS_ACCENT[key]}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{STATUS_LABEL[key]}</span>
              </div>
              <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{isLoading ? "–" : count}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading follow-ups...
          </div>
        ) : (
          <FollowUpCalendar
            tasks={visibleTasks}
            month={month}
            onMonthChange={setMonth}
            onDayClick={setDayInPopup}
          />
        )}
      </div>

      {/* Day popup */}
      <Dialog open={dayInPopup !== null} onOpenChange={(open) => !open && setDayInPopup(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dayInPopup ? format(dayInPopup, "EEEE, MMMM d, yyyy") : ""}</DialogTitle>
            <DialogDescription>
              {popupTasks.length} follow-up{popupTasks.length === 1 ? "" : "s"} scheduled.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2 overflow-auto">
            {popupTasks.map(task => {
              const taskStatus = followUpStatus(task);
              return (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                >
                  <button className="min-w-0 flex-1 text-left" onClick={() => openTask(task)}>
                    <p className="truncate font-medium">{task.company_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[task.name, task.analyst_name && `Analyst: ${formatNameWithInitial(task.analyst_name)}`]
                        .filter(Boolean)
                        .join(" · ") || "No contact on file"}
                    </p>
                    {taskStatus && (
                      <span
                        className={`mt-2 inline-block rounded-sm border px-2 py-0.5 text-[11px] ${STATUS_PILL[taskStatus]}`}
                      >
                        {STATUS_LABEL[taskStatus]}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <FollowUpActions task={task} />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${task.company_name}`}
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <TaskFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        task={editingTask}
      />

      <TaskDetailPanel
        task={selectedTaskData}
        onClose={() => setSelectedTask(null)}
        onEdit={handleEdit}
      />
    </div>
  );
}
