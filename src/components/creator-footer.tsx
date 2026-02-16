
"use client";

import { cn } from "@/lib/utils";

interface CreatorFooterProps {
  className?: string;
}

/**
 * A reusable, high-fidelity footer component for the creator signature.
 * Refined to be a subtle watermark: low contrast, no pointer events, and minimal visual weight.
 * Features a "circle box" (pill) background with glassmorphism.
 */
export function CreatorFooter({ className }: CreatorFooterProps) {
  return (
    <div className={cn("flex items-center justify-center pointer-events-none select-none", className)}>
      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/10 backdrop-blur-sm rounded-full border border-border/20 shadow-none transition-opacity duration-300">
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 whitespace-nowrap">
          Made by Aniruddha with love ❤️
        </span>
      </div>
    </div>
  );
}
