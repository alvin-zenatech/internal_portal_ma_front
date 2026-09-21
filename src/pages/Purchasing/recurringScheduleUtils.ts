import type { RecurringSchedule, FrequencyType } from "@/types/purchasing";

export type { FrequencyType };

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BI_WEEKLY: "Bi-Weekly (Every 2 Weeks)",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly (Every 3 Months)",
  SEMI_ANNUALLY: "Semi-Annually (Every 6 Months)",
  ANNUALLY: "Annually (Every Year)",
  CUSTOM: "Custom Dates (Milestones)",
};

export const FREQUENCY_INTERVAL_MONTHS: Record<FrequencyType, number> = {
  DAILY: 0,
  WEEKLY: 0,
  BI_WEEKLY: 0,
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUALLY: 6,
  ANNUALLY: 12,
  CUSTOM: 0,
};

/**
 * Accurately calculates the target date for cycle index N (0-indexed) from a base start date,
 * preventing month-overflow drift (e.g. Jan 31 -> Feb 28 -> Mar 31 -> Apr 30).
 */
export function getCycleDate(
  startDateInput: string | Date,
  frequency: string,
  cycleIndex: number
): Date {
  const start =
    typeof startDateInput === "string"
      ? new Date(startDateInput.includes("T") ? startDateInput : startDateInput + "T00:00:00")
      : new Date(startDateInput);
  const freq = (frequency || "MONTHLY").toUpperCase();
  const origDay = start.getDate();

  if (cycleIndex === 0) {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate());
  }

  if (freq === "DAILY") {
    const d = new Date(start);
    d.setDate(d.getDate() + cycleIndex);
    return d;
  }
  if (freq === "WEEKLY") {
    const d = new Date(start);
    d.setDate(d.getDate() + cycleIndex * 7);
    return d;
  }
  if (freq === "BI_WEEKLY") {
    const d = new Date(start);
    d.setDate(d.getDate() + cycleIndex * 14);
    return d;
  }

  let monthsToAdd = cycleIndex;
  if (freq === "QUARTERLY") monthsToAdd = cycleIndex * 3;
  else if (freq === "SEMI_ANNUALLY") monthsToAdd = cycleIndex * 6;
  else if (freq === "ANNUALLY") monthsToAdd = cycleIndex * 12;

  const rawMonth = start.getMonth() + monthsToAdd;
  const targetYear = start.getFullYear() + Math.floor(rawMonth / 12);
  const targetMonth = ((rawMonth % 12) + 12) % 12;

  // Last day in target month (day 0 of next month)
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(origDay, lastDayOfTargetMonth);

  return new Date(targetYear, targetMonth, targetDay);
}

/**
 * Adds one or more frequency intervals to a given date string or Date object.
 */
export function addFrequencyInterval(
  dateInput: string | Date,
  frequency: string,
  multiplier: number = 1
): Date {
  return getCycleDate(dateInput, frequency, multiplier);
}

export function formatDateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates remaining duration from today (or fromDate) to endDate.
 * Returns human-friendly text like: "2 years 2 months left", "1 year left", "4 months left", "12 days left".
 */
export function formatRemainingDuration(
  endDateStr?: string | null,
  fromDateInput?: Date | string | null
): { text: string; isExpired: boolean; isNearEnd: boolean; totalDays: number } {
  if (!endDateStr) {
    return { text: "Indefinite", isExpired: false, isNearEnd: false, totalDays: Infinity };
  }

  const end = new Date(endDateStr.includes("T") ? endDateStr : endDateStr + "T00:00:00");
  let from: Date;
  if (!fromDateInput) {
    from = new Date();
  } else if (typeof fromDateInput === "string") {
    from = new Date(fromDateInput.includes("T") ? fromDateInput : fromDateInput + "T00:00:00");
  } else {
    from = new Date(fromDateInput);
  }

  // Normalize to midnight
  end.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - from.getTime();
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < 0) {
    return { text: "Ended", isExpired: true, isNearEnd: false, totalDays };
  }
  if (totalDays === 0) {
    return { text: "Final day today", isExpired: false, isNearEnd: true, totalDays: 0 };
  }

  // Calculate year/month/day breakdown
  let years = end.getFullYear() - from.getFullYear();
  let months = end.getMonth() - from.getMonth();
  let days = end.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  }
  if (years === 0 && months === 0 && days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  const text = parts.length > 0 ? `${parts.join(" ")} left` : "Ending soon";
  const isNearEnd = totalDays <= 60;

  return { text, isExpired: false, isNearEnd, totalDays };
}

/**
 * Calculates total installments count between start and end date based on frequency.
 */
export function calculateInstallmentsCount(
  startDateStr: string,
  endDateStr?: string | null,
  frequency: string = "MONTHLY"
): number {
  if (frequency === "CUSTOM") return 0;
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr.includes("T") ? startDateStr : startDateStr + "T00:00:00");
  const end = new Date(endDateStr.includes("T") ? endDateStr : endDateStr + "T00:00:00");

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  let count = 0;
  const maxSafeCycles = 600; // Safeguard against runaway loops (e.g. 50 years)

  while (count < maxSafeCycles) {
    const cycleDate = getCycleDate(start, frequency, count);
    cycleDate.setHours(0, 0, 0, 0);
    if (cycleDate > end) break;
    count++;
  }

  return count;
}

export interface ProjectedInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  currency: string;
  status: "PAID" | "CURRENT" | "PROJECTED";
  cumulativeAmount: number;
}

/**
 * Generates the full projection schedule from start_date up to end_date (or custom dates list).
 */
export function generatePaymentSchedule(
  schedule?: RecurringSchedule | null,
  defaultAmount: number = 0,
  defaultCurrency: string = "USD",
  statusOverride?: string,
  fallbackStartDate?: string | Date | null
): ProjectedInstallment[] {
  const currency = defaultCurrency || "USD";
  const amountPerCycle =
    schedule?.amount_per_cycle != null && schedule.amount_per_cycle > 0
      ? schedule.amount_per_cycle
      : defaultAmount;
  const completed = schedule?.completed_installments || 0;

  // 1. CUSTOM SCHEDULE DATES (Explicit list of milestone dates)
  if (schedule?.schedule_dates && schedule.schedule_dates.length > 0) {
    let cumulative = 0;
    return schedule.schedule_dates.map((item, idx) => {
      const dStr = typeof item === "string" ? item : item.date;
      const instAmt =
        typeof item === "object" && item.amount != null && Number(item.amount) > 0
          ? Number(item.amount)
          : amountPerCycle;
      cumulative += instAmt;

      let status: "PAID" | "CURRENT" | "PROJECTED" = "PROJECTED";
      if (idx + 1 <= completed) {
        status = "PAID";
      } else if (idx + 1 === completed + 1) {
        status = "CURRENT";
      } else {
        status = "PROJECTED";
      }

      if (statusOverride === "COMPLETED") {
        status = "PAID";
      }

      return {
        installmentNumber: idx + 1,
        dueDate: dStr ? dStr.split("T")[0] : "",
        amount: instAmt,
        currency,
        status,
        cumulativeAmount: Math.round(cumulative * 100) / 100,
      };
    });
  }

  // 2. Simple custom_dates array
  if (schedule?.custom_dates && schedule.custom_dates.length > 0) {
    let cumulative = 0;
    return schedule.custom_dates.map((dStr, idx) => {
      cumulative += amountPerCycle;
      let status: "PAID" | "CURRENT" | "PROJECTED" = "PROJECTED";
      if (idx + 1 <= completed) {
        status = "PAID";
      } else if (idx + 1 === completed + 1) {
        status = "CURRENT";
      } else {
        status = "PROJECTED";
      }

      if (statusOverride === "COMPLETED") {
        status = "PAID";
      }

      return {
        installmentNumber: idx + 1,
        dueDate: dStr ? dStr.split("T")[0] : "",
        amount: amountPerCycle,
        currency,
        status,
        cumulativeAmount: Math.round(cumulative * 100) / 100,
      };
    });
  }

  // 3. PERIODIC SCHEDULE (Formula-based interval generation)
  const startRaw =
    schedule?.start_date ||
    (fallbackStartDate
      ? typeof fallbackStartDate === "string"
        ? fallbackStartDate
        : formatDateToIso(fallbackStartDate)
      : "") ||
    new Date().toISOString().split("T")[0];
  const startDateStr = startRaw.split("T")[0];
  const frequency = schedule?.frequency || "MONTHLY";

  let totalLimit = schedule?.total_installments;

  if (!totalLimit && schedule?.end_date) {
    totalLimit = calculateInstallmentsCount(startDateStr, schedule.end_date.split("T")[0], frequency);
  }
  if (!totalLimit || totalLimit <= 0) {
    totalLimit = 1; // Default to 1 current active cycle for ongoing recurring
  }
  if (totalLimit > 600) {
    totalLimit = 600; // Hard clamp for UI performance
  }

  const installments: ProjectedInstallment[] = [];
  let cumulative = 0;

  for (let i = 1; i <= totalLimit; i++) {
    cumulative += amountPerCycle;
    const cycleDate = getCycleDate(startDateStr, frequency, i - 1);
    const dateStr = formatDateToIso(cycleDate);

    let status: "PAID" | "CURRENT" | "PROJECTED" = "PROJECTED";
    if (i <= completed) {
      status = "PAID";
    } else if (i === completed + 1) {
      status = "CURRENT";
    } else {
      status = "PROJECTED";
    }

    if (statusOverride === "COMPLETED") {
      status = "PAID";
    }

    installments.push({
      installmentNumber: i,
      dueDate: dateStr,
      amount: amountPerCycle,
      currency,
      status,
      cumulativeAmount: Math.round(cumulative * 100) / 100,
    });
  }

  return installments;
}
