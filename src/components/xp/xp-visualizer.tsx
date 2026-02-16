
"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sparkles, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelProgress, calculateLevel, getXPToNextLevel } from "@/lib/xp-system";

interface XPVisualizerProps {
  xp: number;
  className?: string;
  isMini?: boolean;
}

export function XPVisualizer({ xp, className, isMini = false }: XPVisualizerProps) {
  const progress = useMemo(() => getLevelProgress(xp), [xp]);
  const level = useMemo(() => calculateLevel(xp), [xp]);
  const remaining = useMemo(() => getXPToNextLevel(xp), [xp]);

  if (isMini) {
    return (
      <div className={cn("flex flex-col gap-1 w-full", className)}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-primary fill-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-primary">Level {level}</span>
          </div>
          <span className="text-[7px] font-black text-muted-foreground uppercase">{remaining} XP to Ascension</span>
        </div>
        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20 p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-accent rounded-full shadow-[0_0_8px_rgba(var(--primary),0.4)]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6 bg-card border rounded-[2rem] relative overflow-hidden group shadow-xl", className)}>
      {/* Animated Background Pulse */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute -top-10 -right-10 p-12 opacity-[0.03] text-primary"
      >
        <Trophy className="h-32 w-32" />
      </motion.div>

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Verse Rank</span>
            </div>
            <h3 className="text-3xl font-[900] tracking-tighter uppercase leading-none mt-1">
              Level <span className="text-primary italic">{level}</span>
            </h3>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center justify-center relative">
            <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">Progress</span>
            <span className="text-lg font-black text-foreground">{Math.floor(progress)}%</span>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-primary/20 rounded-2xl border-dashed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full bg-muted/40 rounded-full border border-border/50 p-1 overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
              className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full relative"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{xp % 1000} / 1000 XP</span>
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{remaining} TO NEXT NODE</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-3 bg-background/50 rounded-xl border border-border/50 flex items-center gap-3 group-hover:border-primary/20 transition-colors">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-foreground leading-none">{xp}</span>
              <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">Total XP</span>
            </div>
          </div>
          <div className="p-3 bg-background/50 rounded-xl border border-border/50 flex items-center gap-3 group-hover:border-primary/20 transition-colors">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-foreground leading-none">{level}</span>
              <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">Ascension</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
