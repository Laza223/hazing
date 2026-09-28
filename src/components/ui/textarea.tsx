import * as React from "react";

import { cn } from "@/lib/utils";

/** Textarea — mismos tokens que TextInput (border-line, foco outline-ink). */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-control border border-line bg-paper px-3 py-2 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
