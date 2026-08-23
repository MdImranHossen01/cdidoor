import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWhatsAppLink(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Bangladeshi standard: 13 digits starting with 8801
  if (digits.startsWith('8801') && digits.length === 13) {
    return `https://wa.me/${digits}`;
  }
  
  // Bangladeshi local standard: 11 digits starting with 01
  if (digits.startsWith('01') && digits.length === 11) {
    return `https://wa.me/88${digits}`;
  }

  // For other fully qualified numbers with country codes (usually 10+ digits), keep as-is
  if (digits.length >= 10) {
    return `https://wa.me/${digits}`;
  }

  return '';
}


