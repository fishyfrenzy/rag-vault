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
 * Expand year range to comma-separated list for search
 * Examples: 1984, 1994 -> "1984, 1985, 1986, ..., 1994"
 */
export function expandYearRange(start: number | null, end: number | null): string {
  if (!start) return '';
  if (!end || start === end) return start.toString();
  const years: number[] = [];
  for (let y = start; y <= end; y++) {
    years.push(y);
  }
  return years.join(', ');
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
