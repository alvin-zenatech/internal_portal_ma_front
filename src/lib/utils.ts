import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYesNo(val: string | null | undefined): string {
  if (!val) return '';
  const lower = val.toLowerCase().trim();
  if (lower === 'y' || lower === 'yes') return 'Yes';
  if (lower === 'n' || lower === 'no') return 'No';
  return val;
}
