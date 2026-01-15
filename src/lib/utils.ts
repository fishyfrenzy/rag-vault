import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format year range for display
 * Examples: "1988", "1985-1988"
 */
export function formatYearRange(start: number | null, end: number | null): string {
  if (!start) return '';
  if (!end || start === end) return start.toString();
  return `${start}-${end}`;
}

/**
 * Format price range for display
 * Examples: "$50-$100", "$150+"
 */
export function formatPriceRange(low: number | null, high: number | null): string {
  if (!low && !high) return '';
  if (low && !high) return `$${low}+`;
  if (!low && high) return `Up to $${high}`;
  return `$${low}-$${high}`;
}
