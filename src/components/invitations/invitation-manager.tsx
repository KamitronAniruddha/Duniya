
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, writeBatch, arrayUnion } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, Bell, Clock, User, Heart, Sparkles, Zap, ShieldCheck, ShieldAlert, Award, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorFooter } from "@/components/creator-footer";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

        batch.update(communityRef, { 
          members: arrayUnion(user.uid),
          // If the invite role is admin, also add to community admins
          ...(activeInvite.role === "admin" && { admins: arrayUnion(user.uid) })
        });
        
        batch.update(userRef, { serverIds: arrayUnion(activeInvite.communityId) });
        batch.set(memberRef, {
          id: user.uid,
          communityId: activeInvite.communityId,
          userId: user.uid,
          role: activeInvite.role || "member",
          joinedAt: new Date().toISOString()
        });

        toast({ 
          title: activeInvite.role === "admin" ? "Province Command Activated!" : "Welcome to the Verse!", 
          description: `You have successfully joined ${activeInvite.communityName}.` 
        });
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

  if (!activeInvite) return null;

  const isGenesis = activeInvite.type === "genesis";
  const isAdminInvite = activeInvite.role === "admin";

  return (
    <AnimatePresence>
      <Dialog open={!!activeInvite} onOpenChange={() => {}}>
        <DialogContent className={cn(
          "sm:max-w-[480px] w-[92vw] rounded-[3rem] border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] p-0 overflow-hidden bg-background font-body z-[5000] max-h-[92vh] flex flex-col",
          isAdminInvite ? "ring-4 ring-amber-500/20 ring-offset-8 ring-offset-background" : (isGenesis && "ring-4 ring-primary/20 ring-offset-8 ring-offset-background")
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
            className="flex-1 flex flex-col min-h-0"
          >
            {/* High Fidelity Role-Based Header */}
            <div className={cn(
              "h-32 shrink-0 relative flex items-center justify-center overflow-hidden",
              isAdminInvite 
                ? "bg-gradient-to-br from-slate-900 via-amber-900 to-slate-900" 
                : (isGenesis ? "bg-gradient-to-br from-primary via-indigo-600 to-accent" : "bg-gradient-to-br from-primary to-accent")
            )}>
              {/* Background Effects */}
              <div className="absolute inset-0">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} 
                  transition={{ duration: 4, repeat: Infinity }}
                  className={cn("absolute top-0 right-0 p-12", isAdminInvite ? "text-amber-500/10" : "text-white/10")}
                >
                  {isAdminInvite ? <Crown className="h-32 w-32" /> : <Sparkles className="h-32 w-32" />}
                </motion.div>
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className={cn("absolute -bottom-10 -left-10 p-12", isAdminInvite ? "text-amber-500/5" : "text-white/5")}
                >
                  <Zap className="h-40 w-40" />
                </motion.div>
              </div>

              <div className="absolute -bottom-8">
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: 0.2, type: "spring" }}
                  className="relative group"
                >
                  <Avatar className={cn(
                    "h-24 w-24 border-8 border-background shadow-2xl rounded-[2rem] transition-transform group-hover:scale-105",
                    isAdminInvite && "ring-4 ring-amber-500/30"
                  )}>
                    <AvatarImage src={activeInvite.communityIcon} className="object-cover" />
                    <AvatarFallback className={cn("text-white text-3xl font-[900]", isAdminInvite ? "bg-amber-600" : "bg-primary")}>
                      {activeInvite.communityName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isAdminInvite && (
                    <div className="absolute -top-1 -right-1 p-2 bg-amber-500 rounded-xl shadow-xl border-4 border-background text-white animate-bounce">
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </div>
                  )}
                </motion.div>
              </div>

              <div className="absolute top-4 left-6">
                <div className={cn(
                  "backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-2 shadow-lg",
                  isAdminInvite ? "bg-amber-500/20 border-amber-500/30" : "bg-white/20 border-white/30"
                )}>
                  <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isAdminInvite ? "bg-amber-500" : "bg-white")} />
                  <span className={cn("text-[8px] font-black uppercase tracking-[0.2em]", isAdminInvite ? "text-amber-500" : "text-white")}>
                    {isAdminInvite ? "Special Province Promotion" : (isGenesis ? "Genesis Broadcast" : "Direct Invite")}
                  </span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-10 pt-14 pb-6 text-center space-y-6">
                <div className="space-y-2">
                  <h3 className={cn(
                    "text-3xl font-[900] tracking-tighter uppercase leading-tight",
                    isAdminInvite ? "text-amber-600" : "text-foreground"
                  )}>
                    {activeInvite.communityName}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/30 w-fit mx-auto px-3 py-1 rounded-full">
                    <User className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Dispatched by @{activeInvite.senderName}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed italic px-2">
                    {isAdminInvite 
                      ? "The Founders have selected you to serve as a Special Province Admin. Ascend to your post and help govern this new corner of the Verse."
                      : (isGenesis 
                        ? "Hey! I've just initialized a new community in the Verse. Be among the first citizens to join the journey."
                        : "You've been invited to participate in this community. Join the sync and let's Karo Chutiyapaa together.")}
                  </p>

                  {isAdminInvite ? (
                    <div className="p-5 bg-amber-500/5 rounded-[2rem] border border-amber-500/20 flex items-center gap-4 text-left shadow-inner">
                      <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <Award className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Province Authority</span>
                        <p className="text-[8px] font-bold text-muted-foreground">This rank grants management keys over all channels and participants.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4 text-left">
                      <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Citizen Verification</span>
                        <p className="text-[8px] font-bold text-muted-foreground">Original node created by verified entity. Sync path secure.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="px-10 pb-8 pt-2 flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="flex gap-2 flex-1">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-2xl font-black h-12 hover:bg-destructive/5 hover:text-destructive transition-all active:scale-95"
                  onClick={() => handleAction("declined")}
                  disabled={!!processingId}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-2xl font-black h-12 hover:bg-primary/5 hover:text-primary transition-all gap-2 active:scale-95 border border-transparent hover:border-primary/10"
                  onClick={() => handleAction("muted")}
                  disabled={!!processingId}
                  title="Mute for 24h"
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest">24H</span>
                </Button>
              </div>
              <Button 
                className={cn(
                  "flex-1 sm:flex-[1.5] rounded-2xl font-[900] h-12 gap-3 uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                  isAdminInvite 
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/30" 
                    : (isGenesis ? "bg-primary hover:bg-primary/90 text-white shadow-primary/30" : "bg-foreground text-background")
                )}
                onClick={() => handleAction("accepted")}
                disabled={!!processingId}
              >
                {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : (isAdminInvite ? <Crown className="h-4 w-4 fill-current" /> : <Zap className="h-4 w-4 fill-current" />)}
                {isAdminInvite ? "Accept Promotion" : "Enter Verse"}
              </Button>
            </DialogFooter>

            <div className="p-4 bg-muted/20 border-t flex items-center justify-center shrink-0">
              <CreatorFooter className="opacity-60" />
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
