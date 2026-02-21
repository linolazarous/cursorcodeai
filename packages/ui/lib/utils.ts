// packages/ui/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn - Class Name Utility (shadcn/ui standard)
 * 
 * Combines `clsx` and `tailwind-merge` for clean, conditional class handling.
 * Used throughout all @cursorcode/ui components for consistent styling.
 * 
 * Supports:
 * - Conditional classes (e.g. `isActive && "text-blue-500"`)
 * - Tailwind class conflict resolution (last class wins)
 * - Custom brand classes (neon-glow, cyber-card, text-display, etc.)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export type for convenience
export type { ClassValue } from "clsx";
