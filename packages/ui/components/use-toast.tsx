// packages/ui/components/use-toast.tsx
"use client";

import { toast, Toaster } from "sonner";

// Re-export the main toast function (used everywhere in the app)
export { toast };

// Re-export Toaster component (used in root layout)
export { Toaster };

// Export only the types that actually exist in Sonner 1.7.4
export type { ExternalToast } from "sonner";
