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

export const formatNameWithInitial = (name: string | null | undefined): string => {
  if (!name) return 'Unassigned';
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p.charAt(0)).join('').toUpperCase();
};
