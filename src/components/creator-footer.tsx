
"use client";

import { cn } from "@/lib/utils";

interface CreatorFooterProps {
  className?: string;
}

/**
 * A reusable, high-fidelity footer component for the creator signature.
 * Features a "circle box" (pill) background with glassmorphism and theme-aware contrast.
 */
export function CreatorFooter({ className }: CreatorFooterProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 backdrop-blur-md rounded-full border border-border/50 shadow-sm transition-all hover:bg-muted/40 group">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 whitespace-nowrap group-hover:text-muted-foreground transition-colors">
          Made by Aniruddha with love ❤️
        </span>
      </div>
    </div>
  );
}
