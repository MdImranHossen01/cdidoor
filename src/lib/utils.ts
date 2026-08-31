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
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let normalized = phone;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(new RegExp(banglaDigits[i], 'g'), englishDigits[i]);
  }
  let cleaned = normalized.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('88')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0088')) {
    cleaned = cleaned.substring(4);
  }
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}
