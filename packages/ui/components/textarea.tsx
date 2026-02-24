// packages/ui/components/textarea.tsx
import * as React from "react";
import { cn } from "../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-md border border-input bg-card px-4 py-3 text-sm neon-glow focus:border-brand-blue focus:ring-1 focus:ring-brand-blue resize-y",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
