"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Zap, Activity, ShieldCheck, Clock, Plus, Star, Crown, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex flex-col items-center justify-center py-10 opacity-40">
        <Activity className="h-6 w-6 animate-spin text-primary mb-2" />
        <p className="text-[8px] font-black uppercase tracking-[0.3em]">Decrypted Lineage Nodes</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <Clock className="h-10 w-10 text-muted-foreground/10" />
        <div className="space-y-1">
          <h4 className="text-sm font-black uppercase tracking-tighter text-muted-foreground/40">Zero Digital Footprint</h4>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 px-6">Start interacting with the Verse to generate lineage.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          </div>
          <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground leading-none">Lineage Log</h4>
        </div>
        <Badge variant="outline" className="text-[7px] font-black uppercase tracking-tighter opacity-40">Last 25 Nodes</Badge>
      </div>
      
      <ScrollArea className="h-[250px] pr-2">
        <div className="space-y-3 relative pb-6">
          <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-muted/20" />
          
          <AnimatePresence mode="popLayout">
            {history.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-start gap-3 relative z-10 group"
              >
                <div className={cn(
                  "h-8 w-8 rounded-xl border-2 border-background shadow-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110",
                  entry.type === 'chatting' ? "bg-blue-500 text-white" :
                  entry.type === 'presence' ? "bg-emerald-500 text-white" :
                  entry.type === 'genesis' ? "bg-indigo-600 text-white" :
                  "bg-amber-500 text-white"
                )}>
                  {entry.type === 'chatting' ? <MessageSquare className="h-3.5 w-3.5" /> :
                   entry.type === 'presence' ? <Activity className="h-3.5 w-3.5" /> :
                   entry.type === 'genesis' ? <Globe className="h-3.5 w-3.5" /> :
                   <Zap className="h-3.5 w-3.5 fill-current" />}
                </div>
                
                <div className="flex-1 min-w-0 bg-muted/20 p-3 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-card transition-all shadow-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate flex-1">
                        {entry.reason}
                      </span>
                      <span className="text-[9px] font-black text-primary">+{entry.amount} XP</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest italic">
                      <Clock className="h-2 w-2" />
                      <span>{entry.displayTime || formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
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