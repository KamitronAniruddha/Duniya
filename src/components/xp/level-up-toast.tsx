
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorFooter } from "@/components/creator-footer";

interface LevelUpToastProps {
  level: number;
  onClose: () => void;
}

export function LevelUpToast({ level, onClose }: LevelUpToastProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-md px-4"
    >
      <div className="relative p-8 rounded-[3rem] bg-slate-950 border border-primary/30 shadow-[0_32px_128px_rgba(var(--primary),0.4)] overflow-hidden">
        {/* Animated Particle Background */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1.5, 0],
                x: Math.random() * 400 - 200,
                y: Math.random() * 400 - 200
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
              className="absolute left-1/2 top-1/2 text-primary/40"
            >
              <Star className="h-4 w-4 fill-current" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/40"
          >
            <Trophy className="h-12 w-12 text-white fill-white" />
          </motion.div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">Verse Ascension</span>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <h2 className="text-5xl font-[900] tracking-tighter text-white uppercase italic">
              LEVEL <span className="text-primary not-italic">{level}</span>
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              You have evolved into a higher digital node.
            </p>
          </div>

          <div className="w-full flex flex-col gap-4">
            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white gap-3"
              onClick={onClose}
            >
              <Zap className="h-5 w-5 fill-current" /> Continue Journey
            </Button>
            <CreatorFooter className="opacity-40" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
