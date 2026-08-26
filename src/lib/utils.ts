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

export function formatPhoneNumber(val: string | number | null | undefined): string {
  if (!val) return '';
  let s = String(val).trim();
  if (!s || s.toLowerCase() === 'nan' || s.toLowerCase() === 'none' || s === '-') return '';
  
  if (s.endsWith('.0')) s = s.slice(0, -2);

  let ext = '';
  const extMatch = s.match(/[\s,\.;]*(?:ext\.?|x|#)\s*(\d+)/i);
  if (extMatch) {
    ext = ` x${extMatch[1]}`;
    s = s.substring(0, extMatch.index).trim();
  }

  let digits = s.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}${ext}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}${ext}`;
  }
  if (digits.length > 10 && !ext) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)} x${digits.slice(10)}`;
  }
  return s;
}
