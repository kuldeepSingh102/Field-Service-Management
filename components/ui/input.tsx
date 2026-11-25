import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10", className)} {...props} />;
}
