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

export const getUserInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
