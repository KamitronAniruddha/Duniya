"use client";

import { useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  serverId: string;
  channelId: string;
}

export function TypingIndicator({ serverId, channelId }: TypingIndicatorProps) {
  const db = useFirestore();
  const { user } = useUser();

  const typingQuery = useMemoFirebase(() => {
    if (!db || !serverId || !channelId) return null;
    return query(
      collection(db, "communities", serverId, "channels", channelId, "typing")
    );
  }, [db, serverId, channelId]);

  const { data: typingUsers } = useCollection(typingQuery);

  const activeTypers = useMemo(() => {
    if (!typingUsers || !user) return [];
    // Filter out self and ensure the data is fresh (Firestore real-time handles the removal, 
    // but we filter just in case of race conditions during logout)
    return typingUsers.filter(u => u.id !== user.uid);
  }, [typingUsers, user]);

  const typingText = useMemo(() => {
    if (activeTypers.length === 0) return "";
    if (activeTypers.length === 1) return `@${activeTypers[0].username} is typing`;
    if (activeTypers.length === 2) return `@${activeTypers[0].username} and @${activeTypers[1].username} are typing`;
    return `@${activeTypers[0].username} and ${activeTypers.length - 1} others are typing`;
  }, [activeTypers]);

  return (
    <div className="h-6 px-4 flex items-center overflow-hidden">
      <AnimatePresence>
        {activeTypers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3"
          >
            {/* Animated Dots Bubble */}
            <div className="flex items-center gap-1 bg-muted/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-border/50">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    y: [0, -3, 0],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                  className="w-1 h-1 bg-primary rounded-full"
                />
              ))}
            </div>
            
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 italic animate-pulse">
              {typingText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
