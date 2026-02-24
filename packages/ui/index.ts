// packages/ui/index.ts
// Barrel file — Central export point for the entire @cursorcode/ui package
// Usage: import { Button, Card, Input, cn, useToast } from "@cursorcode/ui";


// ==================== CORE UTILITIES ====================
export { cn } from "./lib/utils";
export type { ClassValue } from "clsx";


// ==================== COMPONENTS ====================

// Buttons & Basic
export * from "./components/button";

// Cards & Layout
export * from "./components/card";

// Form Elements
export * from "./components/input";
export * from "./components/textarea";
export * from "./components/label";
export * from "./components/checkbox";

// Feedback & Status
export * from "./components/alert";
export * from "./components/progress";
export * from "./components/badge";

// Navigation
export * from "./components/tabs";

// Data Display
export * from "./components/table";

// Overlays & Dialogs
export * from "./components/alert-dialog";

// Toast / Hooks
export * from "./components/use-toast";


// ==================== TYPE EXPORTS (best DX) ====================

export type { ButtonProps } from "./components/button";
export type { BadgeProps } from "./components/badge";

// Add these as you use more components (optional but recommended):
// export type { CardProps } from "./components/card";
// export type { InputProps } from "./components/input";
// export type { TextareaProps } from "./components/textarea";
// export type { LabelProps } from "./components/label";
// export type { CheckboxProps } from "./components/checkbox";
// etc.
