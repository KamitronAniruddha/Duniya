"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Medal, Trophy, Star, Activity, Sparkles, User, ShieldCheck } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Sparkles className="h-8 w-8 animate-pulse text-primary/40" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Syncing Sovereign Node</p>
      </div>
    );
  }

  const topThree = leaders?.slice(0, 3) || [];
  const others = leaders?.slice(3) || [];

  return (
    <div className="space-y-10">
      {/* Top 3 Podium - Blown Up Visual */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 pt-10 px-4">
        {/* Rank 2 */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-2 md:order-1 flex flex-col items-center gap-4 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-slate-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <Avatar className="h-24 w-24 border-4 border-slate-300 shadow-2xl transition-transform group-hover:scale-110">
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
              <p className="text-[10px] font-black text-primary">{topThree[1].xp} XP</p>
            </div>
            <div className="h-16 w-32 bg-slate-100 dark:bg-slate-900 rounded-t-[2rem] border-x border-t border-slate-300/50 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-400">#2</span>
            </div>
          </motion.div>
        )}

        {/* Rank 1 */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="order-1 md:order-2 flex flex-col items-center gap-4 group mb-4 md:mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150 animate-pulse" />
              <Avatar className="h-32 w-32 border-8 border-primary shadow-[0_32px_64px_rgba(var(--primary),0.4)] transition-all group-hover:scale-110 group-hover:rotate-3">
                <AvatarImage src={topThree[0].photoURL} className="object-cover" />
                <AvatarFallback className="bg-primary text-white font-black text-4xl">{topThree[0].username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -top-6 -right-6 h-14 w-14 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl border-4 border-background -rotate-12 group-hover:rotate-0 transition-transform animate-bounce">
                <Crown className="h-7 w-7 text-white fill-white" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-lg font-[900] uppercase tracking-tighter text-foreground truncate max-w-[160px]">@{topThree[0].username}</h4>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1">Prime Resonator</Badge>
              <p className="text-xs font-black text-primary">{topThree[0].xp} XP</p>
            </div>
            <div className="h-24 w-40 bg-primary/10 rounded-t-[2.5rem] border-x border-t border-primary/30 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
              <span className="text-4xl font-black text-primary relative z-10">#1</span>
            </div>
          </motion.div>
        )}

        {/* Rank 3 */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="order-3 flex flex-col items-center gap-4 group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-amber-600/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <Avatar className="h-20 w-20 border-4 border-amber-600/50 shadow-2xl transition-transform group-hover:scale-110">
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
              <p className="text-[10px] font-black text-primary">{topThree[2].xp} XP</p>
            </div>
            <div className="h-12 w-28 bg-amber-50 dark:bg-amber-950/20 rounded-t-[1.5rem] border-x border-t border-amber-600/30 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-amber-700">#3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Others List */}
      <ScrollArea className="h-[400px] px-6 pb-10">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
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
                  "flex items-center gap-4 p-4 rounded-3xl transition-all border group",
                  isMe ? "bg-primary/10 border-primary shadow-lg" : "bg-card border-transparent hover:border-muted hover:bg-muted/30"
                )}
              >
                <span className="text-lg font-black text-muted-foreground/40 italic w-8 text-center">{rank}</span>
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                    <AvatarImage src={leader.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-black text-xs">{leader.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-background rounded-full border border-border flex items-center justify-center">
                    <Badge className="h-4 px-1 text-[7px] font-black bg-primary/10 text-primary border-none">L{level}</Badge>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black uppercase tracking-tight text-foreground truncate">@{leader.username}</h4>
                    {isMe && <Badge className="bg-primary text-white text-[7px] font-black uppercase px-1.5 h-4">YOU</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground italic opacity-60">{rankTitle}</span>
                    <div className="h-1 w-1 rounded-full bg-border" />
                    <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                      <Zap className="h-2.5 w-2.5 fill-primary" />
                      {leader.xp || 0} XP
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Activity className="h-4 w-4 text-primary/40" />
                  <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">Verified Node</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </ScrollArea>
    </div>
  );
}
