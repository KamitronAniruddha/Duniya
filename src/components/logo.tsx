
"use client";

import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20" />
        <path d="M2 12h20" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Heart className="h-2/5 w-2/5 text-red-500 fill-red-500" />
      </div>
    </div>
  );
}
