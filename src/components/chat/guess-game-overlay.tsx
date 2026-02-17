"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, TrendingUp, TrendingDown, Target, HelpCircle, Activity, Heart, Star, Sparkles, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface GuessGameOverlayProps {
  activeGame?: {
    secretNumber?: number;
    lastGuess?: number;
    lastGuesserName?: string;
    lastGuesserPhoto?: string;
    status: "active" | "won";
    attempts: number;
    hint?: "higher" | "lower" | "correct";
    winnerName?: string;
    digits?: number;
    min?: number;
    max?: number;
    reward?: number;
    creatorId?: string;
  };
  onClose?: () => void;
  onEnd?: () => void;
  isAdmin?: boolean;
  currentUserId?: string;
}

export function GuessGameOverlay({ activeGame, onClose, onEnd, isAdmin, currentUserId }: GuessGameOverlayProps) {
  if (!activeGame || activeGame.status === "won") return null;

  const isCreator = currentUserId === activeGame.creatorId;
  const canTerminate = isAdmin || isCreator;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4"
    >
      <div className="relative p-4 rounded-[2rem] bg-background/80 backdrop-blur-xl border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Target className="h-3.5 w-3.5 text-primary animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Guess Master Node ({activeGame.digits || 2}D)
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] font-black uppercase px-2 h-5 border-primary/10">
                Attempts: {activeGame.attempts || 0}
              </Badge>
              
              <div className="flex items-center gap-1">
                {canTerminate && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                    onClick={onEnd}
                    title="Terminate Game (Authority)"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  onClick={onClose}
                  title="Leave Game (Local)"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-2xl border border-border/50">
            <div className="h-12 w-20 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 shadow-inner">
              <AnimatePresence mode="wait">
                <motion.span 
                  key={activeGame.lastGuess}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-black text-foreground italic"
                >
                  {activeGame.lastGuess !== undefined ? activeGame.lastGuess : "???"}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0">
              {activeGame.lastGuess !== undefined ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Last Intel from</span>
                    <span className="text-[9px] font-black text-foreground uppercase truncate">@{activeGame.lastGuesserName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeGame.hint === "higher" ? (
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="text-xs font-black uppercase tracking-tight">Go Higher</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-blue-500">
                        <TrendingDown className="h-3.5 w-3.5" />
                        <span className="text-xs font-black uppercase tracking-tight">Go Lower</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground uppercase tracking-tight">Awaiting Sync...</span>
                  <p className="text-[9px] text-muted-foreground italic leading-none">
                    Guess between {activeGame.min ?? 10}-{activeGame.max ?? 99}
                  </p>
                </div>
              )}
            </div>

            {activeGame.lastGuesserPhoto && (
              <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                <AvatarImage src={activeGame.lastGuesserPhoto} />
                <AvatarFallback className="text-[8px] font-black bg-primary text-white">U</AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 px-2">
            {[...Array(10)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: activeGame.attempts > i ? 1 : 0.2
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  activeGame.attempts > i ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
