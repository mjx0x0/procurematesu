import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-stone-400 shadow-xs transition-colors focus:border-[#7A1315] focus:ring-2 focus:ring-[#7A1315]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
