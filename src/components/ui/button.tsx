import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-white rounded-full shadow-btn-gold hover:shadow-btn-gold-hover hover:brightness-105 active:scale-[0.98]",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground rounded-full hover:bg-muted dark:hover:bg-muted hover:shadow-sm",
        secondary:
          "bg-muted dark:bg-muted text-foreground rounded-full border border-border shadow-neu-sm hover:bg-accent dark:hover:bg-accent hover:shadow-sm",
        ghost:
          "rounded-full hover:bg-muted dark:hover:bg-muted hover:text-gold-700 dark:hover:text-gold-400",
        link:
          "text-gold-600 underline-offset-4 hover:underline rounded-full",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-10 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
