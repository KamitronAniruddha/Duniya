"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Zap, Activity, ShieldCheck, Clock, Plus } from "lucide-react";
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
      limit(20)
    );
  }, [db, userId]);

  const { data: history, isLoading } = useCollection(historyQuery);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-6 w-6 animate-spin text-primary/40" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center">
        <Clock className="h-10 w-10 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Digital Footprint Detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Lineage Log</h4>
      </div>
      
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3 relative">
          {/* Timeline Connector */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/50" />
          
          <AnimatePresence mode="popLayout">
            {history.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-4 relative z-10"
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl border border-background shadow-sm flex items-center justify-center shrink-0",
                  entry.type === 'chatting' ? "bg-blue-500/10 text-blue-500" :
                  entry.type === 'presence' ? "bg-emerald-500/10 text-emerald-500" :
                  "bg-amber-500/10 text-amber-500"
                )}>
                  {entry.type === 'chatting' ? <MessageSquare className="h-4 w-4" /> :
                   entry.type === 'presence' ? <Activity className="h-4 w-4" /> :
                   <Zap className="h-4 w-4" />}
                </div>
                
                <div className="flex-1 min-w-0 bg-muted/30 p-3 rounded-[1.25rem] border border-transparent hover:border-primary/10 transition-all group">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate">
                      {entry.reason}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Plus className="h-2 w-2 text-primary" />
                      <span className="text-xs font-black text-primary">{entry.amount} XP</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-60 transition-opacity">
                    <Clock className="h-3 w-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest italic">
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </span>
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
