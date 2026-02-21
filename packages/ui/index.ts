// packages/ui/index.ts
// Barrel file — Central export point for @cursorcode/ui
// Import everything from here: import { Button, Card, Input, useToast } from "@cursorcode/ui";

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

// Toast
export * from "./components/use-toast";

// Re-export common utilities
export { cn } from "./lib/utils";

// Type exports for convenience
export type { ButtonProps } from "./components/button";
export type { BadgeProps } from "./components/badge";
