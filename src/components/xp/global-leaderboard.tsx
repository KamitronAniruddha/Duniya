"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Medal, Trophy, Star, Activity, Sparkles, User, ShieldCheck, Zap, ArrowUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateLevel, getRankTitle } from "@/lib/xp-system";
import { ScrollArea } from "@/components/ui/scroll-area";

export function GlobalLeaderboard() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  
  const leaderboardQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "users"),
      orderBy("xp", "desc"),
      limit(50)
    );
  }, [db]);

  const { data: leaders, isLoading } = useCollection(leaderboardQuery);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative">
          <Sparkles className="h-10 w-10 animate-pulse text-primary/40" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-8px] border-2 border-dashed border-primary/20 rounded-full"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Syncing Sovereign Node</p>
      </div>
    );
  }

  const topThree = leaders?.slice(0, 3) || [];
  const others = leaders?.slice(3) || [];

  return (
    <div className="space-y-12 pb-10">
      {/* Top 3 Podium - Blown Up Visual */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-10 pt-12 px-4">
        {/* Rank 2 - Master Node */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="order-2 md:order-1 flex flex-col items-center gap-4 group w-full md:w-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-slate-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <Avatar className="h-24 w-24 border-4 border-slate-300 shadow-[0_20px_50px_rgba(148,163,184,0.3)] transition-all group-hover:scale-110 group-hover:rotate-[-2deg]">
                <AvatarImage src={topThree[1].photoURL} className="object-cover" />
                <AvatarFallback className="bg-slate-400 text-white font-black text-2xl">{topThree[1].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-3 -right-3 h-10 w-10 bg-slate-300 rounded-2xl flex items-center justify-center shadow-xl border-4 border-background rotate-12 group-hover:rotate-0 transition-transform">
                <Trophy className="h-5 w-5 text-slate-600" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black uppercase tracking-tight text-foreground truncate max-w-[120px]">@{topThree[1].username}</h4>
              <Badge variant="secondary" className="bg-slate-400/10 text-slate-600 border-none text-[8px] font-black uppercase tracking-widest px-2">Master Node</Badge>
              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-primary">
                <Zap className="h-3 w-3 fill-current" /> {topThree[1].xp} XP
              </div>
            </div>
            <div className="h-20 w-32 bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-900 rounded-t-[2.5rem] border-x border-t border-slate-300/50 flex flex-col items-center justify-center shadow-inner">
              <span className="text-3xl font-black text-slate-400">#2</span>
            </div>
          </motion.div>
        )}

        {/* Rank 1 - Prime Resonator */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="order-1 md:order-2 flex flex-col items-center gap-5 group mb-4 md:mb-10 w-full md:w-auto"
          >
            <div className="relative">
              {/* Specialized Sovereign Aura */}
              <div className="absolute inset-0 bg-primary/30 blur-[40px] rounded-full scale-150 animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-15px] border-2 border-dashed border-primary/30 rounded-full"
              />
              <Avatar className="h-36 w-32 md:h-40 md:w-40 border-[10px] border-primary shadow-[0_32px_80px_rgba(var(--primary),0.5)] transition-all group-hover:scale-110 group-hover:rotate-3">
                <AvatarImage src={topThree[0].photoURL} className="object-cover" />
                <AvatarFallback className="bg-primary text-white font-black text-5xl">{topThree[0].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-8 -right-8 h-16 w-16 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl border-4 border-background -rotate-12 group-hover:rotate-0 transition-transform animate-bounce">
                <Crown className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-xl font-[1000] uppercase tracking-tighter text-foreground truncate max-w-[200px]">@{topThree[0].username}</h4>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full shadow-lg">Prime Resonator</Badge>
              <div className="flex items-center justify-center gap-1.5 text-xs font-black text-primary">
                <Sparkles className="h-4 w-4 fill-current" /> {topThree[0].xp} XP
              </div>
            </div>
            <div className="h-32 w-48 bg-gradient-to-b from-primary/20 to-transparent rounded-t-[3rem] border-x border-t border-primary/40 flex flex-col items-center justify-center relative overflow-hidden shadow-[inset_0_4px_20px_rgba(var(--primary),0.2)]">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
              <span className="text-5xl font-black text-primary relative z-10 italic">#1</span>
            </div>
          </motion.div>
        )}

        {/* Rank 3 - Core Guardian */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="order-3 flex flex-col items-center gap-4 group w-full md:w-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-amber-600/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <Avatar className="h-20 w-20 border-4 border-amber-600/50 shadow-[0_20px_50px_rgba(217,119,6,0.3)] transition-all group-hover:scale-110 group-hover:rotate-[2deg]">
                <AvatarImage src={topThree[2].photoURL} className="object-cover" />
                <AvatarFallback className="bg-amber-700 text-white font-black text-xl">{topThree[2].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 h-8 w-8 bg-amber-600 rounded-xl flex items-center justify-center shadow-xl border-4 border-background -rotate-6 group-hover:rotate-0 transition-transform">
                <Medal className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-xs font-black uppercase tracking-tight text-foreground truncate max-w-[100px]">@{topThree[2].username}</h4>
              <Badge variant="secondary" className="bg-amber-600/10 text-amber-700 border-none text-[8px] font-black uppercase tracking-widest px-2">Core Guardian</Badge>
              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-primary">
                <Zap className="h-3 w-3 fill-current" /> {topThree[2].xp} XP
              </div>
            </div>
            <div className="h-16 w-28 bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/30 rounded-t-[2rem] border-x border-t border-amber-600/30 flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-amber-700">#3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Others List - High Fidelity Hierarchy */}
      <div className="px-2">
        <div className="flex items-center justify-between px-6 mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">VERSE HIERARCHY</span>
          <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase">
            <Activity className="h-3 w-3" /> Live Pulse Sync
          </div>
        </div>
        
        <ScrollArea className="h-[450px] px-4">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3 pb-10"
          >
            {others.map((leader, idx) => {
              const rank = idx + 4;
              const level = calculateLevel(leader.xp || 0);
              const rankTitle = getRankTitle(level);
              const isMe = leader.id === currentUser?.uid;

              return (
                <motion.div
                  key={leader.id}
                  variants={item}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-[2rem] transition-all border group relative overflow-hidden",
                    isMe ? "bg-primary/10 border-primary shadow-xl ring-4 ring-primary/5" : "bg-card border-border/50 hover:border-primary/20 hover:bg-muted/30"
                  )}
                >
                  <div className="flex flex-col items-center w-8 shrink-0">
                    <span className="text-xl font-black text-muted-foreground/30 italic group-hover:text-primary/40 transition-colors leading-none">#{rank}</span>
                  </div>
                  
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-background shadow-md transition-transform group-hover:scale-105">
                      <AvatarImage src={leader.photoURL} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-black text-sm">{leader.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-background rounded-full border border-border flex items-center justify-center shadow-lg">
                      <Badge className="h-5 px-1.5 text-[8px] font-black bg-primary text-white border-none">L{level}</Badge>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase tracking-tight text-foreground truncate">@{leader.username}</h4>
                      {isMe && <Badge className="bg-primary text-white text-[7px] font-black uppercase px-2 h-4 animate-pulse">CITIZEN NODE</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest italic opacity-60",
                        isMe ? "text-primary" : "text-muted-foreground"
                      )}>{rankTitle}</span>
                      <div className="h-1 w-1 rounded-full bg-border" />
                      <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                        <Zap className="h-3 w-3 fill-current" />
                        {leader.xp || 0} XP
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                    <div className="flex -space-x-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                      ))}
                    </div>
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">Verified node</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  );
}
