
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, TrendingUp, TrendingDown, Target, HelpCircle, Activity, Heart, Star, Sparkles, X, Trash2, CheckCircle2 } from "lucide-react";
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
  if (!activeGame) return null;

  const isWon = activeGame.status === "won";
  const isCreator = currentUserId === activeGame.creatorId;
  const canTerminate = isAdmin || isCreator;
  const digits = Number(activeGame.digits || 2);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4"
    >
      <div className={cn(
        "relative p-4 rounded-[2rem] backdrop-blur-xl border shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500",
        isWon ? "bg-green-500/90 border-green-400/50" : "bg-background/80 border-primary/20"
      )}>
        {isWon && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                className="absolute left-1/2 top-1/2 text-white/40"
              >
                <Star className="h-4 w-4 fill-current" />
              </motion.div>
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg transition-colors", isWon ? "bg-white/20" : "bg-primary/10")}>
                {isWon ? (
                  <Trophy className="h-3.5 w-3.5 text-white animate-bounce" />
                ) : (
                  <Target className="h-3.5 w-3.5 text-primary animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                isWon ? "text-white" : "text-primary"
              )}>
                {isWon ? "Node Cracked!" : `Guess Master Node (${digits}D)`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn(
                "text-[8px] font-black uppercase px-2 h-5 border",
                isWon ? "bg-white/20 text-white border-white/30" : "bg-primary/5 text-primary border-primary/10"
              )}>
                Attempts: {activeGame.attempts || 0}
              </Badge>
              
              {!isWon && (
                <div className="flex items-center gap-1">
                  {canTerminate ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                      onClick={onEnd}
                      title="Terminate Game (Authority)"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                      onClick={onClose}
                      title="Dismiss Game (Local)"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-4 p-3 rounded-2xl border transition-all duration-500",
            isWon ? "bg-white/10 border-white/20" : "bg-muted/30 border-border/50"
          )}>
            <div className={cn(
              "h-12 w-20 rounded-xl border flex items-center justify-center shrink-0 shadow-inner transition-all",
              isWon ? "bg-white border-transparent" : "bg-background border-border"
            )}>
              <AnimatePresence mode="wait">
                <motion.span 
                  key={activeGame.lastGuess}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-2xl font-black italic",
                    isWon ? "text-green-600" : "text-foreground"
                  )}
                >
                  {activeGame.lastGuess !== undefined ? activeGame.lastGuess : "???"}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0">
              {isWon ? (
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">Victor Identified</span>
                  <h4 className="text-sm font-black text-white uppercase truncate">@{activeGame.winnerName}</h4>
                </div>
              ) : activeGame.lastGuess !== undefined ? (
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
                    Guess between {activeGame.min ?? (digits === 1 ? 0 : digits === 3 ? 100 : 10)}-{activeGame.max ?? (digits === 1 ? 9 : digits === 3 ? 999 : 99)}
                  </p>
                </div>
              )}
            </div>

            {isWon ? (
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            ) : activeGame.lastGuesserPhoto && (
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
                animate={isWon ? {
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                  backgroundColor: ["#ffffff", "#4ade80", "#ffffff"]
                } : { 
                  scale: [1, 1.2, 1],
                  opacity: (activeGame.attempts || 0) > i ? 1 : 0.2
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  isWon ? "bg-white" : ((activeGame.attempts || 0) > i ? "bg-primary" : "bg-muted")
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
