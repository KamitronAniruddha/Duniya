"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sparkles, Trophy, Star, ArrowUpRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelProgress, calculateLevel, getXPToNextLevel, getRankTitle } from "@/lib/xp-system";
import { Badge } from "@/components/ui/badge";

interface XPVisualizerProps {
  xp: number;
  className?: string;
  isMini?: boolean;
}

export function XPVisualizer({ xp, className, isMini = false }: XPVisualizerProps) {
  const progress = useMemo(() => getLevelProgress(xp), [xp]);
  const level = useMemo(() => calculateLevel(xp), [xp]);
  const remaining = useMemo(() => getXPToNextLevel(xp), [xp]);
  const rank = useMemo(() => getRankTitle(level), [level]);

  if (isMini) {
    return (
      <div className={cn("flex flex-col gap-1 w-full", className)}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-primary fill-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-primary">Level {level}</span>
          </div>
          <span className="text-[6px] font-black text-muted-foreground uppercase opacity-60 italic">{remaining} XP TO NEXT NODE</span>
        </div>
        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20 p-[1px] shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-accent rounded-full relative"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 md:p-6 bg-card border rounded-[2rem] relative overflow-hidden group shadow-lg transition-all hover:shadow-primary/5", className)}>
      {/* High Fidelity Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 -right-6 p-8 text-primary"
      >
        <Trophy className="h-24 w-24 md:h-32 md:w-32" />
      </motion.div>

      <div className="relative z-10 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary animate-pulse" />
              </div>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-primary/80">Digital Evolution Status</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none text-foreground italic">
              LEVEL <span className="text-primary not-italic">{level}</span>
            </h3>
            <div className="mt-2.5 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-2.5 py-0.5 rounded-full">
                {rank}
              </Badge>
            </div>
          </div>
          
          <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center justify-center relative shadow-inner group-hover:border-primary/20 transition-all shrink-0">
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground">Sync</span>
            <span className="text-lg md:text-xl font-black text-foreground italic">{Math.floor(progress)}%</span>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-3px] border border-primary/10 rounded-[1.25rem] border-dashed"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="h-3 md:h-4 w-full bg-muted/40 rounded-full border border-border/50 p-0.5 overflow-hidden relative shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 40, damping: 12 }}
              className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full relative"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
          <div className="flex items-center justify-between px-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{xp % 1000} / 1000 XP NODE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest">{remaining} XP TO NEXT ASCENSION</span>
              <ArrowUpRight className="h-2.5 w-2.5 text-primary" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 md:p-4 bg-background/50 rounded-2xl border border-border/50 flex items-center gap-3 transition-all group-hover:border-primary/20 group-hover:bg-background shadow-sm hover:shadow-md">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
              <Zap className="h-4 w-4 md:h-5 md:w-5 fill-current" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg md:text-xl font-black text-foreground leading-none tracking-tighter truncate">{xp || 0}</span>
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Total Lineage</span>
            </div>
          </div>
          <div className="p-3 md:p-4 bg-background/50 rounded-2xl border border-border/50 flex items-center gap-3 transition-all group-hover:border-accent/20 group-hover:bg-background shadow-sm hover:shadow-md">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shadow-inner shrink-0">
              <Star className="h-4 w-4 md:h-5 md:w-5 fill-current" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg md:text-xl font-black text-foreground leading-none tracking-tighter truncate">#{level}</span>
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Node Rank</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
