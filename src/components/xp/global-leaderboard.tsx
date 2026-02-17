
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Medal, Trophy, Star, Activity, Sparkles, Zap, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateLevel, getRankTitle } from "@/lib/xp-system";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SharedIntelligenceDialog } from "./shared-intelligence-dialog";

export function GlobalLeaderboard() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  
  // SECURE QUERY DECLARATION
  const leadersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "users"),
      orderBy("xp", "desc"),
      limit(50)
    );
  }, [db]);

  const { data: leaders, isLoading } = useCollection(leadersQuery);

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
    <div className="space-y-8 pb-10">
      {/* Interactive Sovereign Podium */}
      <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-6 pt-6 px-4">
        {topThree[1] && (
          <PodiumItem 
            user={topThree[1]} 
            rank={2} 
            delay={0.2} 
            onInspect={() => setInspectUserId(topThree[1].id)}
          />
        )}

        {topThree[0] && (
          <PodiumItem 
            user={topThree[0]} 
            rank={1} 
            delay={0} 
            isPrimary 
            onInspect={() => setInspectUserId(topThree[0].id)}
          />
        )}

        {topThree[2] && (
          <PodiumItem 
            user={topThree[2]} 
            rank={3} 
            delay={0.3} 
            onInspect={() => setInspectUserId(topThree[2].id)}
          />
        )}
      </div>

      <div className="px-2">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-[900] uppercase tracking-[0.2em] text-foreground">Global Hierarchy</span>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary text-[7px] font-black border-primary/10">Active Nodes: {leaders?.length || 0}</Badge>
        </div>
        
        <ScrollArea className="h-[350px] px-2">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-2.5 pb-10">
            {others.map((leader, idx) => (
              <motion.button
                key={leader.id}
                variants={item}
                onClick={() => setInspectUserId(leader.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-3.5 rounded-[1.5rem] transition-all border group text-left",
                  leader.id === currentUser?.uid ? "bg-primary/10 border-primary shadow-xl ring-2 ring-primary/5" : "bg-card/50 border-border/50 hover:border-primary/20 hover:bg-muted/30"
                )}
              >
                <span className="w-6 text-sm font-black text-muted-foreground/30 italic group-hover:text-primary/40 text-center">#{idx + 4}</span>
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11 border shadow-sm group-hover:scale-110 transition-transform">
                    <AvatarImage src={leader.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-black text-sm">{leader.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -bottom-1.5 -right-1.5 h-5 px-1.5 text-[8px] font-black bg-background text-primary border border-primary/20">L{calculateLevel(leader.xp || 0)}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black uppercase tracking-tight text-foreground truncate">@{leader.username}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest italic opacity-60 truncate">{getRankTitle(calculateLevel(leader.xp || 0))}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase bg-primary/5 px-2.5 py-1 rounded-full">
                    <Zap className="h-3 w-3 fill-current" />
                    {leader.xp || 0}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </ScrollArea>
      </div>

      {/* Shared Intelligence Deep-Dive */}
      <SharedIntelligenceDialog 
        open={!!inspectUserId} 
        onOpenChange={(open) => !open && setInspectUserId(null)} 
        userId={inspectUserId || ""} 
      />
    </div>
  );
}

function PodiumItem({ user, rank, delay, isPrimary = false, onInspect }: { user: any; rank: number; delay: number; isPrimary?: boolean; onInspect: () => void }) {
  const level = calculateLevel(user.xp || 0);
  
  return (
    <motion.button 
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      onClick={onInspect}
      className={cn(
        "flex flex-col items-center gap-4 group w-full md:w-auto relative",
        isPrimary ? "mb-6" : "mb-0"
      )}
    >
      <div className="relative">
        <div className={cn(
          "absolute inset-0 blur-[40px] rounded-full scale-150 animate-pulse",
          rank === 1 ? "bg-primary/30" : rank === 2 ? "bg-slate-400/20" : "bg-amber-600/20"
        )} />
        <Avatar className={cn(
          "shadow-2xl transition-all group-hover:scale-110 border-[6px]",
          isPrimary ? "h-24 w-24 md:h-28 md:w-28 border-primary" : rank === 2 ? "h-20 w-20 border-slate-300" : "h-16 w-16 border-amber-600/50"
        )}>
          <AvatarImage src={user.photoURL} className="object-cover" />
          <AvatarFallback className={cn("text-white font-black", isPrimary ? "text-3xl bg-primary" : "text-xl bg-muted")}>
            {user.username?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -top-4 -right-4 h-9 w-9 md:h-11 md:w-11 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-background -rotate-6 group-hover:rotate-0 transition-transform",
          rank === 1 ? "bg-primary text-white" : rank === 2 ? "bg-slate-200 text-slate-600" : "bg-amber-600 text-white"
        )}>
          {rank === 1 ? <Crown className="h-5 w-5 fill-current" /> : rank === 2 ? <Trophy className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
        </div>
      </div>
      <div className="text-center">
        <h4 className={cn("font-black uppercase tracking-tight text-foreground truncate max-w-[120px]", isPrimary ? "text-base" : "text-xs")}>@{user.username}</h4>
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-[900] text-primary uppercase mt-0.5">
          <Zap className="h-3 w-3 fill-current" /> {user.xp} XP
        </div>
      </div>
      <div className={cn(
        "bg-gradient-to-b from-muted/50 to-transparent rounded-t-[2rem] border-x border-t border-border/50 flex flex-col items-center justify-center shadow-inner relative overflow-hidden",
        isPrimary ? "h-16 w-28 md:w-32" : rank === 2 ? "h-12 w-24 md:w-28" : "h-10 w-20 md:w-24"
      )}>
        <span className={cn("font-black italic opacity-40", isPrimary ? "text-3xl" : "text-xl")}>#{rank}</span>
        {isPrimary && <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-5px] border border-primary/10 rounded-full border-dashed" />}
      </div>
    </motion.button>
  );
}
