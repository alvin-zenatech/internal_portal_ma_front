import { addDays, isValid, parseISO, startOfDay } from "date-fns";
import { type PipelineTask } from "@/hooks/usePipeline";

export type FollowUpStatus = "pastDue" | "dueThisWeek" | "onTrack";

/** A follow-up counts as "this week" if it lands within this many days from today. */
export const DUE_WINDOW_DAYS = 7;

/** follow_up_date comes back as a date-only string; keep every comparison on the day key. */
export const followUpDayKey = (task: PipelineTask) => task.follow_up_date?.slice(0, 10) ?? null;

export function parseFollowUpDay(task: PipelineTask): Date | null {
  const key = followUpDayKey(task);
  if (!key) return null;
  const day = parseISO(key);
  return isValid(day) ? day : null;
}

export function followUpStatus(
  task: PipelineTask,
  today: Date = startOfDay(new Date())
): FollowUpStatus | null {
  const day = parseFollowUpDay(task);
  if (!day) return null;
  if (day < today) return "pastDue";
  if (day <= addDays(today, DUE_WINDOW_DAYS)) return "dueThisWeek";
  return "onTrack";
}

export const STATUS_LABEL: Record<FollowUpStatus, string> = {
  pastDue: "Past Due",
  dueThisWeek: "Due This Week",
  onTrack: "On Track",
};

/** Pill styling for a company name inside a calendar cell. */
export const STATUS_PILL: Record<FollowUpStatus, string> = {
  pastDue:
    "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/70",
  dueThisWeek:
    "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/70",
  onTrack:
    "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/70",
};

export const STATUS_ACCENT: Record<FollowUpStatus, string> = {
  pastDue: "text-red-600 dark:text-red-400",
  dueThisWeek: "text-amber-600 dark:text-amber-400",
  onTrack: "text-emerald-600 dark:text-emerald-400",
};

export const STATUS_RING: Record<FollowUpStatus, string> = {
  pastDue: "ring-2 ring-red-500",
  dueThisWeek: "ring-2 ring-amber-500",
  onTrack: "ring-2 ring-emerald-500",
};
