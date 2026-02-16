"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Zap, Activity, ShieldCheck, Clock, Plus, Star, Crown, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface XPHistoryListProps {
  userId: string;
}

export function XPHistoryList({ userId }: XPHistoryListProps) {
  const db = useFirestore();
  const historyQuery = useMemoFirebase(() => {
    if (!db || !userId) return null;
    return query(
      collection(db, "users", userId, "xp_history"),
      orderBy("timestamp", "desc"),
      limit(25)
    );
  }, [db, userId]);

  const { data: history, isLoading } = useCollection(historyQuery);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Activity className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">Decrypted Lineage Nodes</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="relative">
          <Clock className="h-16 w-16 text-muted-foreground/10" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
          />
        </div>
        <div className="space-y-1">
          <h4 className="text-lg font-black uppercase tracking-tighter text-muted-foreground/40">Zero Digital Footprint</h4>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 px-10">Start interacting with the Verse to generate your digital history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground leading-none">Lineage Log</h4>
            <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Verse Records Node</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter opacity-40">Showing Last 25 Nodes</Badge>
      </div>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4 relative pb-10">
          {/* Animated Timeline Connector */}
          <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/40 via-muted to-transparent rounded-full" />
          
          <AnimatePresence mode="popLayout">
            {history.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 120 }}
                className="flex items-start gap-5 relative z-10 group"
              >
                {/* Node Point */}
                <div className={cn(
                  "h-12 w-12 rounded-[1.25rem] border-4 border-background shadow-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110",
                  entry.type === 'chatting' ? "bg-blue-500 text-white" :
                  entry.type === 'presence' ? "bg-emerald-500 text-white" :
                  entry.type === 'genesis' ? "bg-indigo-600 text-white" :
                  "bg-amber-500 text-white"
                )}>
                  {entry.type === 'chatting' ? <MessageSquare className="h-5 w-5" /> :
                   entry.type === 'presence' ? <Activity className="h-5 w-5" /> :
                   entry.type === 'genesis' ? <Globe className="h-5 w-5" /> :
                   <Zap className="h-5 w-5 fill-current" />}
                </div>
                
                {/* Log Content */}
                <div className="flex-1 min-w-0 bg-muted/20 p-4 rounded-[1.75rem] border border-transparent hover:border-primary/20 hover:bg-card transition-all shadow-sm group-hover:shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-[0.08] transition-opacity">
                    <Star className="h-12 w-12" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-[1000] uppercase tracking-tight text-foreground truncate">
                        {entry.reason}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-primary/5 rounded-lg border border-primary/10">
                        <Plus className="h-3 w-3 text-primary stroke-[3px]" />
                        <span className="text-sm font-black text-primary">{entry.amount} XP</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest italic">
                          <Clock className="h-3 w-3" />
                          <span>{entry.displayTime || formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                        <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">#{entry.type}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge className="bg-primary/5 text-primary border-none text-[7px] font-black uppercase px-1.5 h-4">Verified</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
