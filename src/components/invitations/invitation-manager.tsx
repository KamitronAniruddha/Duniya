
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, writeBatch, arrayUnion } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, Bell, Clock, User, Heart, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorFooter } from "@/components/creator-footer";
import { cn } from "@/lib/utils";

export function InvitationManager() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const invitesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "invitations"),
      where("targetUserId", "==", user.uid),
      where("status", "==", "pending")
    );
  }, [db, user?.uid]);

  const { data: invites } = useCollection(invitesQuery);

  const activeInvite = useMemo(() => {
    if (!invites || invites.length === 0 || !userData) return null;
    
    const now = new Date().toISOString();
    const filteredInvites = invites.filter(invite => {
      const mutes = (userData as any).mutedInviteCommunities || {};
      const expiry = mutes[invite.communityId];
      return !expiry || expiry < now;
    });

    if (filteredInvites.length === 0) return null;
    return filteredInvites[filteredInvites.length - 1];
  }, [invites, userData]);

  const handleAction = async (status: "accepted" | "declined" | "muted") => {
    if (!activeInvite || !user || !db) return;
    setProcessingId(activeInvite.id);

    try {
      const batch = writeBatch(db);
      const inviteRef = doc(db, "invitations", activeInvite.id);

      if (status === "accepted") {
        const communityRef = doc(db, "communities", activeInvite.communityId);
        const userRef = doc(db, "users", user.uid);
        const memberRef = doc(db, "communities", activeInvite.communityId, "members", user.uid);

        batch.update(communityRef, { members: arrayUnion(user.uid) });
        batch.update(userRef, { serverIds: arrayUnion(activeInvite.communityId) });
        batch.set(memberRef, {
          id: user.uid,
          communityId: activeInvite.communityId,
          userId: user.uid,
          role: "member",
          joinedAt: new Date().toISOString()
        });

        toast({ title: "Welcome to the Verse!", description: `You have successfully joined ${activeInvite.communityName}.` });
        batch.update(inviteRef, { status: "accepted" });
      } else if (status === "muted") {
        const userRef = doc(db, "users", user.uid);
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        batch.update(userRef, {
          [`mutedInviteCommunities.${activeInvite.communityId}`]: expiry
        });
        batch.update(inviteRef, { status: "declined" });
        toast({ 
          title: "Community Muted", 
          description: `Invitations for ${activeInvite.communityName} blocked for 24h.` 
        });
      } else {
        batch.update(inviteRef, { status: "declined" });
      }

      await batch.commit();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Error", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const isGenesis = activeInvite?.type === "genesis";

  return (
    <AnimatePresence>
      {activeInvite && (
        <Dialog open={!!activeInvite} onOpenChange={() => {}}>
          <DialogContent className={cn(
            "sm:max-w-[450px] w-[92vw] rounded-[3rem] border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] p-0 overflow-hidden bg-background font-body z-[5000]",
            isGenesis && "ring-4 ring-primary/20 ring-offset-8 ring-offset-background"
          )}>
            <DialogHeader className="sr-only">
              <DialogTitle>Community Invitation</DialogTitle>
              <DialogDescription>You have been invited to join {activeInvite.communityName}.</DialogDescription>
            </DialogHeader>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className={cn(
                "h-32 relative flex items-center justify-center overflow-hidden",
                isGenesis ? "bg-gradient-to-br from-primary via-indigo-600 to-accent" : "bg-gradient-to-br from-primary to-accent"
              )}>
                {/* Animated Background Elements for Genesis */}
                {isGenesis && (
                  <div className="absolute inset-0">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} 
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute top-0 right-0 p-12 text-white/10"
                    >
                      <Sparkles className="h-32 w-32" />
                    </motion.div>
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute -bottom-10 -left-10 p-12 text-white/5"
                    >
                      <Zap className="h-40 w-40" />
                    </motion.div>
                  </div>
                )}

                <div className="absolute -bottom-10">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ delay: 0.2, type: "spring" }}
                    className="relative group"
                  >
                    <Avatar className="h-28 w-28 border-8 border-background shadow-2xl rounded-[2.5rem] transition-transform group-hover:scale-105">
                      <AvatarImage src={activeInvite.communityIcon} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white text-4xl font-[900]">
                        {activeInvite.communityName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isGenesis && (
                      <div className="absolute -top-2 -right-2 p-2.5 bg-accent rounded-2xl shadow-xl border-4 border-background text-white animate-bounce">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="absolute top-6 left-6">
                  <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 flex items-center gap-2.5 shadow-lg">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                      {isGenesis ? "Genesis Broadcast" : "Direct Invite"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-10 pt-16 pb-8 text-center space-y-6">
                <div className="space-y-2">
                  {isGenesis && (
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 block mb-1">A New Universe Is Born</span>
                  )}
                  <h3 className="text-3xl font-[900] tracking-tighter uppercase leading-tight text-foreground">{activeInvite.communityName}</h3>
                  <div className="flex items-center justify-center gap-2.5 text-muted-foreground bg-muted/30 w-fit mx-auto px-4 py-1.5 rounded-full">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Dispatched by @{activeInvite.senderName}</span>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed italic px-2">
                  {isGenesis 
                    ? "Hey! I've just initialized a new community in the Verse. Be among the first to join the journey."
                    : "You've been invited to participate in this community. Join the sync and let's Karo Chutiyapaa together."}
                </p>

                {isGenesis && (
                  <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4 text-left">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Identity Verified</span>
                      <p className="text-[9px] font-bold text-muted-foreground">Original node created by verified entity.</p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-10 pb-10 pt-2 flex flex-col sm:flex-row gap-4">
                <div className="flex gap-3 flex-1">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-2xl font-black h-14 hover:bg-destructive/5 hover:text-destructive transition-all active:scale-95"
                    onClick={() => handleAction("declined")}
                    disabled={!!processingId}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-2xl font-black h-14 hover:bg-primary/5 hover:text-primary transition-all gap-2.5 active:scale-95 border border-transparent hover:border-primary/10"
                    onClick={() => handleAction("muted")}
                    disabled={!!processingId}
                    title="Mute for 24h"
                  >
                    <Clock className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">24H</span>
                  </Button>
                </div>
                <Button 
                  className={cn(
                    "flex-1 sm:flex-[1.5] rounded-2xl font-[900] h-14 gap-3 uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                    isGenesis ? "bg-primary hover:bg-primary/90 text-white shadow-primary/30" : "bg-foreground text-background"
                  )}
                  onClick={() => handleAction("accepted")}
                  disabled={!!processingId}
                >
                  {processingId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
                  Enter Verse
                </Button>
              </DialogFooter>

              <div className="p-5 bg-muted/20 border-t flex items-center justify-center">
                <CreatorFooter className="opacity-60" />
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
