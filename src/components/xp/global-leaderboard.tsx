
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Sparkles className="h-8 w-8 animate-pulse text-primary/40" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Sovereign Node</p>
      </div>
    );
  }

  const topThree = leaders?.slice(0, 3) || [];
  const others = leaders?.slice(3) || [];

  return (
    <div className="space-y-8 pb-6">
      {/* Top 3 Podium - Intelligent Responsiveness */}
      <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-6 md:gap-6 pt-10 px-4">
        {/* Rank 2 - Master Node */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="order-2 md:order-1 flex flex-col items-center gap-3 group w-full md:w-auto"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 border-[3px] border-slate-300 shadow-xl transition-all group-hover:scale-105">
                <AvatarImage src={topThree[1].photoURL} className="object-cover" />
                <AvatarFallback className="bg-slate-400 text-white font-black text-xl">{topThree[1].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 h-7 w-7 md:h-8 md:w-8 bg-slate-200 rounded-xl flex items-center justify-center shadow-lg border-2 border-background">
                <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-600" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-xs font-black uppercase tracking-tight text-foreground truncate max-w-[100px]">@{topThree[1].username}</h4>
              <div className="flex items-center justify-center gap-1 text-[9px] font-black text-primary uppercase">
                <Zap className="h-2.5 w-2.5 fill-current" /> {topThree[1].xp} XP
              </div>
            </div>
            <div className="h-10 md:h-14 w-20 md:w-24 bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-900 rounded-t-2xl border-x border-t border-slate-300/50 flex flex-col items-center justify-center shadow-inner">
              <span className="text-lg md:text-xl font-black text-slate-400">#2</span>
            </div>
          </motion.div>
        )}

        {/* Rank 1 - Prime Resonator */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="order-1 md:order-2 flex flex-col items-center gap-4 group mb-2 md:mb-6 w-full md:w-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full scale-125 animate-pulse" />
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-[6px] border-primary shadow-2xl transition-all group-hover:scale-105">
                <AvatarImage src={topThree[0].photoURL} className="object-cover" />
                <AvatarFallback className="bg-primary text-white font-black text-3xl md:text-4xl">{topThree[0].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-4 -right-4 h-10 w-10 md:h-12 md:w-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl border-4 border-background -rotate-6 group-hover:rotate-0 transition-transform">
                <Crown className="h-5 w-5 md:h-6 md:w-6 text-white fill-white" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-sm md:text-base font-black uppercase tracking-tighter text-foreground truncate max-w-[150px]">@{topThree[0].username}</h4>
              <div className="flex items-center justify-center gap-1 text-[10px] md:text-xs font-black text-primary uppercase">
                <Sparkles className="h-3 w-3 fill-current" /> {topThree[0].xp} XP
              </div>
            </div>
            <div className="h-16 md:h-20 w-28 md:w-32 bg-gradient-to-b from-primary/20 to-transparent rounded-t-3xl border-x border-t border-primary/40 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              <span className="text-3xl md:text-4xl font-black text-primary italic">#1</span>
            </div>
          </motion.div>
        )}

        {/* Rank 3 - Core Guardian */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="order-3 flex flex-col items-center gap-3 group w-full md:w-auto"
          >
            <div className="relative">
              <Avatar className="h-14 w-14 md:h-16 md:w-16 border-[3px] border-amber-600/50 shadow-xl transition-all group-hover:scale-105">
                <AvatarImage src={topThree[2].photoURL} className="object-cover" />
                <AvatarFallback className="bg-amber-700 text-white font-black text-lg">{topThree[2].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-1.5 -right-1.5 h-6 w-6 md:h-7 md:w-7 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-background">
                <Medal className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-tight text-foreground truncate max-w-[80px]">@{topThree[2].username}</h4>
              <div className="flex items-center justify-center gap-1 text-[8px] font-black text-primary uppercase">
                <Zap className="h-2 w-2 fill-current" /> {topThree[2].xp} XP
              </div>
            </div>
            <div className="h-10 md:h-12 w-16 md:w-20 bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/30 rounded-t-xl border-x border-t border-amber-600/30 flex flex-col items-center justify-center shadow-inner">
              <span className="text-base md:text-lg font-black text-amber-700">#3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Others List */}
      <div className="px-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">VERSE HIERARCHY</span>
          <Activity className="h-3 w-3 text-primary/40" />
        </div>
        
        <ScrollArea className="h-[300px] md:h-[350px] px-2">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-2 pb-6">
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
                    "flex items-center gap-3 p-3 rounded-2xl transition-all border group",
                    isMe ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/5" : "bg-card border-border/50 hover:border-primary/20 hover:bg-muted/30"
                  )}
                >
                  <span className="w-6 text-sm font-black text-muted-foreground/30 italic group-hover:text-primary/40 text-center">#{rank}</span>
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform">
                      <AvatarImage src={leader.photoURL} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-black text-xs">{leader.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-1 -right-1 h-4 px-1 text-[7px] font-black bg-background text-primary border border-border">L{level}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase tracking-tight text-foreground truncate">@{leader.username}</h4>
                    <p className="text-[8px] font-bold uppercase tracking-widest italic opacity-60 truncate">{rankTitle}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase bg-primary/5 px-2 py-1 rounded-lg shrink-0">
                    <Zap className="h-2.5 w-2.5 fill-current" />
                    {leader.xp || 0}
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
