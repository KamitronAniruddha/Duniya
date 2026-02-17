
"use client";

import { useMemo } from "react";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Activity, Ghost, Lock, Fingerprint, Compass, 
  Globe, Users, Landmark, Milestone, Zap, ShieldCheck, Info 
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { CreatorFooter } from "@/components/creator-footer";
import { calculateLevel, getRankTitle } from "@/lib/xp-system";

interface SharedIntelligenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fallbackName?: string;
  fallbackPhotoURL?: string;
}

/**
 * A high-fidelity reusable component for showing advanced user details.
 * Used in chat (Shared Thoughts) and the Sovereign Leaderboard.
 */
export function SharedIntelligenceDialog({ 
  open, 
  onOpenChange, 
  userId, 
  fallbackName,
  fallbackPhotoURL 
}: SharedIntelligenceDialogProps) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  
  const targetRef = useMemoFirebase(() => (userId ? doc(db, "users", userId) : null), [db, userId]);
  const { data: userData, isLoading } = useDoc(targetRef);

  const isHidden = !!userData?.isProfileHidden && userData?.id !== currentUser?.uid;
  const isBlurred = !!userData?.isProfileBlurred && 
                    userData?.id !== currentUser?.uid && 
                    !userData?.authorizedViewers?.some((v: any) => v.uid === currentUser?.uid && new Date(v.expiresAt) > new Date());

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const displayName = userData?.username || userData?.displayName || fallbackName || "Unknown Node";
  const level = calculateLevel(userData?.xp || 0);
  const rank = getRankTitle(level);

  const accountAge = useMemo(() => {
    if (!userData?.createdAt) return "Origin Era";
    try {
      return formatDistanceToNow(new Date(userData.createdAt));
    } catch {
      return "Unknown Era";
    }
  }, [userData?.createdAt]);

  const stats = useMemo(() => {
    if (!userData) return { total: 0 };
    return { total: userData.serverIds?.length || 0 };
  }, [userData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[3rem] border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] p-0 overflow-hidden bg-background h-[90vh] max-h-[750px] flex flex-col z-[2000]">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent shrink-0 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary animate-spin-slow" />
              <span className="text-[7px] font-black uppercase tracking-[0.4em] text-primary/80">Social Depth Intelligence</span>
            </div>
            <div className="px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[6px] font-black text-primary uppercase tracking-widest">v2.5.0 Stable</span>
            </div>
          </div>
          <DialogTitle className="text-xl md:text-2xl font-[900] tracking-tighter uppercase leading-tight text-foreground relative z-10">
            Digital <span className="text-primary italic">Pulse</span>
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground/80 text-[9px] mt-0.5 italic relative z-10 leading-relaxed">
            "Real-time decryption of digital lineage."
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Zap className="h-8 w-8 text-primary/20 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground">Syncing Node...</span>
            </div>
          ) : (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="p-6 md:p-8 pt-2 space-y-8"
            >
              <motion.div variants={item} className="flex flex-col items-center text-center gap-4 md:gap-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <Avatar className={cn(
                    "h-24 w-24 md:h-28 md:w-28 border-8 border-background shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-2", 
                    isHidden && "blur-2xl", 
                    isBlurred && "blur-lg"
                  )}>
                    <AvatarImage src={isHidden ? undefined : (userData?.photoURL || fallbackPhotoURL)} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-3xl font-[900] uppercase">{displayName[0]}</AvatarFallback>
                  </Avatar>
                  {isHidden && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Ghost className="h-10 w-10 text-rose-500 animate-pulse drop-shadow-lg" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 p-2.5 bg-primary rounded-2xl shadow-xl border-4 border-background">
                    <Fingerprint className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">@{displayName}</h3>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 h-5">
                      <Activity className="h-2.5 w-2.5 mr-1" /> Synchronized
                    </Badge>
                    <Badge className="bg-primary/5 text-primary/60 border border-primary/10 text-[8px] font-black uppercase px-2 h-5">L{level}</Badge>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <motion.div variants={item} className="p-4 md:p-5 bg-muted/30 rounded-[1.75rem] border border-transparent hover:border-primary/20 transition-all group flex flex-col gap-1.5 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 p-8 opacity-0 group-hover:opacity-10 transition-opacity"><Globe className="h-10 w-10" /></div>
                  <div className="flex items-center gap-2 text-primary">
                    <Compass className="h-3.5 w-3.5" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em]">Verse Reach</span>
                  </div>
                  {isHidden ? <Lock className="h-3.5 w-3.5 text-muted-foreground/30" /> : <span className="text-xl font-black text-foreground">{stats.total}</span>}
                  <p className="text-[6px] text-muted-foreground font-bold uppercase tracking-widest">Total Communities</p>
                </motion.div>

                <motion.div variants={item} className="p-4 md:p-5 bg-muted/30 rounded-[1.75rem] border border-transparent hover:border-primary/20 transition-all group flex flex-col gap-1.5 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 p-8 opacity-0 group-hover:opacity-10 transition-opacity"><Landmark className="h-10 w-10" /></div>
                  <div className="flex items-center gap-2 text-primary">
                    <Milestone className="h-3.5 w-3.5" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em]">Verse Age</span>
                  </div>
                  {isHidden ? <Lock className="h-3.5 w-3.5 text-muted-foreground/30" /> : <span className="text-sm font-black text-foreground truncate">{accountAge}</span>}
                  <p className="text-[6px] text-muted-foreground font-bold uppercase tracking-widest">Identity Longevity</p>
                </motion.div>

                <motion.div variants={item} className="p-4 md:p-5 bg-primary/10 rounded-[1.75rem] border border-primary/20 transition-all group flex flex-col gap-1.5 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em]">Ascension</span>
                  </div>
                  <span className="text-sm font-black text-primary uppercase">{rank}</span>
                  <p className="text-[6px] text-primary/60 font-bold uppercase tracking-widest">Protocol Rank</p>
                </motion.div>

                <motion.div variants={item} className="p-4 md:p-5 bg-primary/10 rounded-[1.75rem] border border-primary/20 transition-all group flex flex-col gap-1.5 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em]">Security</span>
                  </div>
                  <span className="text-sm font-black text-primary uppercase">Grade AAA</span>
                  <p className="text-[6px] text-primary/60 font-bold uppercase tracking-widest">Protocol Trust</p>
                </motion.div>
              </div>

              <motion.div variants={item} className="p-5 bg-card border rounded-[2rem] space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em]">Energy Signature</span>
                  </div>
                  <span className="text-[6px] font-black text-muted-foreground/60 uppercase">Live Pulse</span>
                </div>
                
                <div className="h-16 w-full flex items-end gap-1 px-1 relative">
                  {isHidden ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 backdrop-blur-sm rounded-2xl">
                      <Ghost className="h-5 w-5 text-primary/20 animate-pulse" />
                    </div>
                  ) : (
                    [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.9, 1, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h * 100}%` }}
                        transition={{ delay: 0.5 + (i * 0.05), duration: 1, type: "spring" }}
                        className="flex-1 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors"
                      />
                    ))
                  )}
                </div>
              </motion.div>

              {!isHidden && userData?.bio && (
                <motion.div variants={item} className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 p-6 opacity-[0.03]"><Activity className="h-12 w-12 text-primary" /></div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-primary flex items-center justify-center text-primary">
                      <Info className="h-1.5 w-1.5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Persona Manifesto</span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed relative z-10 italic">
                    "{userData.bio}"
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </ScrollArea>

        <div className="p-5 bg-muted/20 border-t flex items-center justify-center shrink-0">
          <CreatorFooter />
        </div>
      </DialogContent>
    </Dialog>
  );
}
