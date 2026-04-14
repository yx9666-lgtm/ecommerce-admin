"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface DateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function formatDisplay(isoValue: string): string {
  if (!isoValue) return "";
  const [y, m, d] = isoValue.split("-");
  return `${y}/${m}/${d}`;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value = "", onChange, className, placeholder = "yyyy/mm/dd" }, ref) => {
    const hiddenRef = React.useRef<HTMLInputElement>(null);

    return (
      <div className={cn("relative", className)}>
        <div
          className="flex h-10 w-full items-center rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => hiddenRef.current?.showPicker()}
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <CalendarDays className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
        <input
          ref={(el) => {
            (hiddenRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }}
          type="date"
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
