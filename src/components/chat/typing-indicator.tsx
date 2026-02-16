"use client";

import { useMemo, useState, useEffect } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  serverId: string;
  channelId: string;
}

export function TypingIndicator({ serverId, channelId }: TypingIndicatorProps) {
  const db = useFirestore();
  const { user } = useUser();
  const [now, setNow] = useState(Date.now());

  // Heartbeat for local pruning of stale typing records
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(interval);
  }, []);

  const typingQuery = useMemoFirebase(() => {
    if (!db || !serverId || !channelId) return null;
    return query(
      collection(db, "communities", serverId, "channels", channelId, "typing")
    );
  }, [db, serverId, channelId]);

  const { data: typingUsers } = useCollection(typingQuery);

  const activeTypers = useMemo(() => {
    if (!typingUsers || !user) return [];
    
    // STRICT REAL-TIME FILTERING:
    // Only show typers who have updated their status in the last 6 seconds.
    return typingUsers.filter(u => {
      if (u.id === user.uid) return false;
      const lastTyped = u.lastTypedAt ? new Date(u.lastTypedAt).getTime() : 0;
      return (now - lastTyped) < 6000;
    });
  }, [typingUsers, user, now]);

  const typingText = useMemo(() => {
    if (activeTypers.length === 0) return "";
    if (activeTypers.length === 1) return `@${activeTypers[0].username} is typing`;
    if (activeTypers.length === 2) return `@${activeTypers[0].username} and @${activeTypers[1].username} are typing`;
    return `@${activeTypers[0].username} and ${activeTypers.length - 1} others are typing`;
  }, [activeTypers]);

  return (
    <div className="h-10 px-4 flex items-center overflow-hidden pointer-events-none relative">
      <AnimatePresence mode="wait">
        {activeTypers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-2 bg-primary/5 dark:bg-primary/10 backdrop-blur-xl px-3 py-1.5 rounded-full border border-primary/20 shadow-[0_8px_30px_rgba(var(--primary),0.1)] group"
          >
            <div className="flex -space-x-2 mr-1">
              {activeTypers.slice(0, 3).map((typer, i) => (
                <motion.div
                  key={typer.id}
                  initial={{ scale: 0, x: -10 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                >
                  <Avatar className="h-5 w-5 border-2 border-background shadow-sm ring-1 ring-primary/10">
                    <AvatarImage src={typer.photoURL || undefined} />
                    <AvatarFallback className="bg-primary text-[6px] text-white font-black">
                      {typer.username?.[0]?.toUpperCase() || <Ghost className="h-2 w-2" />}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-background/40 px-2 py-1 rounded-full border border-border/50">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    y: [0, -4, 0],
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                />
              ))}
            </div>
            
            <motion.span 
              layout
              className="text-[10px] font-black uppercase tracking-widest text-primary/80 italic pr-1"
            >
              {typingText}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
