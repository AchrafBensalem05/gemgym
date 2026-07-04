/**
 * GemGym — Class Name Utility
 *
 * Merges Tailwind classes safely using clsx + tailwind-merge.
 * Prevents class conflicts (e.g., two padding utilities).
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
