
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, writeBatch, arrayUnion } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, Bell, Clock, User, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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

  // Show the most recent invitation that isn't from a muted community
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

        toast({ title: "Welcome!", description: `You have joined ${activeInvite.communityName}.` });
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
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AnimatePresence>
      {activeInvite && (
        <Dialog open={!!activeInvite} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-[0_32px_64px_rgba(0,0,0,0.2)] p-0 overflow-hidden bg-background">
            <DialogHeader className="sr-only">
              <DialogTitle>Community Invitation</DialogTitle>
              <DialogDescription>You have been invited to join {activeInvite.communityName}.</DialogDescription>
            </DialogHeader>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <div className="h-24 bg-gradient-to-br from-primary to-accent relative flex items-center justify-center">
                <div className="absolute -bottom-8">
                  <Avatar className="h-20 w-24 border-4 border-background shadow-xl rounded-[1.5rem]">
                    <AvatarImage src={activeInvite.communityIcon} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-2xl font-black">
                      {activeInvite.communityName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 flex items-center gap-2">
                  <Bell className="h-3 w-3 text-white animate-bounce" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white">New Request</span>
                </div>
              </div>

              <div className="px-8 pt-12 pb-6 text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">{activeInvite.communityName}</h3>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Invited by {activeInvite.senderName}</span>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-muted-foreground leading-relaxed italic px-4">
                  "Hey! Join our community in the Verse and let's Karo Chutiyapaa together."
                </p>
              </div>

              <DialogFooter className="px-8 pb-8 pt-2 flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-xl font-bold h-12 hover:bg-destructive/5 hover:text-destructive transition-colors"
                    onClick={() => handleAction("declined")}
                    disabled={!!processingId}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-xl font-bold h-12 hover:bg-primary/5 hover:text-primary transition-colors gap-2"
                    onClick={() => handleAction("muted")}
                    disabled={!!processingId}
                    title="Mute for 24h"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">24H</span>
                  </Button>
                </div>
                <Button 
                  className="flex-1 rounded-xl font-black h-12 shadow-lg shadow-primary/20 gap-2"
                  onClick={() => handleAction("accepted")}
                  disabled={!!processingId}
                >
                  {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Join Verse
                </Button>
              </DialogFooter>

              <div className="p-4 bg-muted/20 border-t flex items-center justify-center">
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                  <span>Verified Invitation by Duniya</span>
                  <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
