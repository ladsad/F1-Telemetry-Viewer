import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(" ")
}