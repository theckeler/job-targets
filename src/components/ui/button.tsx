import { cn } from "@/src/lib/utils";
import { ButtonHTMLAttributes } from "react";

function Button({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "bg-black/20 min-w-12 px-4 py-2 flex items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { Button };
