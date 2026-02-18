// packages/ui/index.ts
// Barrel file - Central export point for all UI components
// Import everything from here: import { Button, Card, Input } from "@cursorcode/ui";

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

// Re-export common utilities (if you have them)
export { cn } from "./lib/utils"; // optional, if you have a shared utils file

// Type exports for convenience
export type { ButtonProps } from "./components/button";
export type { BadgeProps } from "./components/badge";
