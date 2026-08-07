import { useMemo, memo } from "react";
import { type PipelineTask } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  STATUS_PILL,
  followUpDayKey,
  followUpStatus,
  type FollowUpStatus,
} from "./followUpStatus";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_OPTS = { weekStartsOn: 1 } as const;
const MAX_PILLS = 3;

const FollowUpCalendar = memo(function FollowUpCalendar({
  tasks,
  month,
  onMonthChange,
  onDayClick,
}: {
  tasks: PipelineTask[];
  month: Date;
  onMonthChange: (month: Date) => void;
  onDayClick: (day: Date) => void;
}) {
  const monthStart = startOfMonth(month);

  const { days, tasksByDay, monthCount } = useMemo(() => {
    const grid = eachDayOfInterval({
      start: startOfWeek(monthStart, WEEK_OPTS),
      end: endOfWeek(endOfMonth(monthStart), WEEK_OPTS),
    });

    const byDay = new Map<string, Array<{ task: PipelineTask; status: FollowUpStatus }>>();
    let inMonth = 0;

    tasks.forEach(task => {
      const key = followUpDayKey(task);
      const status = followUpStatus(task);
      if (!key || !status) return;

      const entries = byDay.get(key);
      if (entries) entries.push({ task, status });
      else byDay.set(key, [{ task, status }]);

      if (key.startsWith(format(monthStart, "yyyy-MM"))) inMonth += 1;
    });

    return { days: grid, tasksByDay: byDay, monthCount: inMonth };
  }, [monthStart, tasks]);

  return (
    <div>
      {/* Month header */}
      <div className="flex items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{format(monthStart, "MMMM yyyy")}</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {monthCount} follow-up{monthCount === 1 ? "" : "s"} this month
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => onMonthChange(startOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider"
            onClick={() => onMonthChange(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => onMonthChange(startOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-7 border-l border-t">
        {WEEKDAYS.map(label => (
          <div
            key={label}
            className="border-r border-b bg-card px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const entries = tasksByDay.get(key) ?? [];
          const outside = !isSameMonth(day, monthStart);
          const today = isToday(day);
          const hidden = entries.length - MAX_PILLS;

          return (
            <div
              key={key}
              className={`min-h-[96px] border-r border-b p-2 ${outside ? "bg-muted/40" : "bg-background"} ${
                entries.length ? "cursor-pointer transition-colors hover:bg-muted/60" : ""
              }`}
              onClick={entries.length ? () => onDayClick(day) : undefined}
              role={entries.length ? "button" : undefined}
              tabIndex={entries.length ? 0 : undefined}
              aria-label={entries.length ? `${format(day, "MMMM d")} — ${entries.length} follow-ups` : undefined}
              onKeyDown={
                entries.length
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDayClick(day);
                      }
                    }
                  : undefined
              }
            >
              {today ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                  {format(day, "d")}
                </span>
              ) : (
                <span
                  className={`flex size-6 items-center justify-center text-xs font-medium ${
                    outside ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
              )}

              <div className="mt-1 space-y-1">
                {entries.slice(0, MAX_PILLS).map(({ task, status }) => (
                  <div
                    key={task.id}
                    title={`${task.company_name}${task.name ? ` — ${task.name}` : ""}`}
                    className={`truncate rounded-sm border px-2 py-1 text-[11px] leading-tight ${
                      outside ? "border-border bg-muted text-muted-foreground" : STATUS_PILL[status]
                    }`}
                  >
                    {task.company_name}
                  </div>
                ))}
                {hidden > 0 && (
                  <div className="px-1 text-[11px] font-medium text-muted-foreground">+{hidden} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default FollowUpCalendar;
