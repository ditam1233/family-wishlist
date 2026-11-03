import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price?: number, currency = '₽'): string {
  if (price === undefined || price === null) return '';
  return `${new Intl.NumberFormat('ru-RU').format(price)} ${currency}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getDaysUntilBirthday(birthday?: string): number | null {
  if (!birthday) return null;
  const today = new Date();
  const bday = new Date(birthday);
  
  const currentYear = today.getFullYear();
  let nextBday = new Date(currentYear, bday.getMonth(), bday.getDate());
  
  // Если день рождения уже прошел в этом году, считаем до следующего года
  if (nextBday.getTime() < today.getTime()) {
    nextBday = new Date(currentYear + 1, bday.getMonth(), bday.getDate());
  }
  
  const diffTime = nextBday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
