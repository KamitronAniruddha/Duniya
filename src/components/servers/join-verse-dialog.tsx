
"use client";

import { useState, useEffect } from "react";
import { useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, getDocs, limit, writeBatch } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Compass, Loader2, Zap, Globe, Users, CheckCircle2, ShieldCheck, Sparkles, Fingerprint, Activity, ArrowRight, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CreatorFooter } from "@/components/creator-footer";

interface JoinVerseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (serverId: string) => void;
}

export function JoinVerseDialog({ open, onOpenChange, onJoined }: JoinVerseDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [foundCommunity, setFoundCommunity] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setFoundCommunity(null);
      setError(null);
      setIsScanning(false);
    }
  }, [open]);

  useEffect(() => {
    const scanCode = async () => {
      const cleanCode = code.trim();
      if (cleanCode.length < 5) {
        setFoundCommunity(null);
        setError(null);
        return;
      }

      setIsScanning(true);
      setError(null);

      try {
        const q = query(collection(db, "communities"), where("joinCode", "==", cleanCode), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("No node detected at this signature.");
          setFoundCommunity(null);
        } else {
          const data = snap.docs[0].data();
          setFoundCommunity({ ...data, id: snap.docs[0].id });
        }
      } catch (e) {
        setError("Sync interrupted.");
      } finally {
        setIsScanning(false);
      }
    };

    const timeout = setTimeout(scanCode, 400);
    return () => clearTimeout(timeout);
  }, [code, db]);

  const handleJoin = async () => {
    if (!foundCommunity || !user || !db || isJoining) return;
    setIsJoining(true);

    try {
      const batch = writeBatch(db);
      const communityId = foundCommunity.id;
      
      batch.update(doc(db, "communities", communityId), {
        members: arrayUnion(user.uid)
      });
      
      batch.update(doc(db, "users", user.uid), {
        serverIds: arrayUnion(communityId)
      });

      batch.set(doc(db, "communities", communityId, "members", user.uid), {
        id: user.uid,
        communityId: communityId,
        userId: user.uid,
        role: "member",
        joinedAt: new Date().toISOString()
      });

      await batch.commit();
      
      toast({ title: "Verse Synchronized", description: `Welcome to ${foundCommunity.name}.` });
      onJoined(communityId);
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Join Error", description: e.message });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background font-body flex flex-col h-fit max-h-[90vh]">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent shrink-0 relative overflow-hidden">
          {/* Animated Scanning Background */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Compass className="h-32 w-32 animate-spin-slow" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-primary/10 rounded-md">
                  <Zap className="h-3.5 w-3.5 text-primary fill-primary animate-pulse" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary/60">Portal Protocol v6.0</span>
              </div>
              <DialogTitle className="text-2xl font-[900] tracking-tighter uppercase leading-none text-foreground">
                Join <span className="text-primary italic">Verse</span>
              </DialogTitle>
            </div>
            <Activity className="h-5 w-5 text-primary/30" />
          </div>
        </DialogHeader>

        <div className="p-8 pt-2 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="relative group">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 ml-1 mb-2 block">
                Verse Signature (Join Code)
              </Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/30 group-focus-within:text-primary transition-colors" />
                <Input 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())} 
                  placeholder="X X X X X" 
                  maxLength={5}
                  className="bg-muted/30 border-none h-16 pl-12 text-center text-3xl font-black tracking-[0.5em] rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:opacity-20"
                />
                <AnimatePresence>
                  {isScanning && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive/5 rounded-xl border border-destructive/10 text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                </motion.div>
              )}

              {foundCommunity && (
                <motion.div 
                  key={foundCommunity.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  className="relative p-6 rounded-[2.5rem] bg-card border shadow-xl overflow-hidden group"
                >
                  {/* Holographic Decoration */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                  
                  <div className="flex flex-col items-center text-center gap-6 relative z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                      <Avatar className="h-24 w-24 border-4 border-background shadow-2xl transition-transform group-hover:scale-105 group-hover:rotate-2">
                        <AvatarImage src={foundCommunity.icon} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white text-3xl font-black uppercase">
                          {foundCommunity.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-xl shadow-lg border-2 border-background text-white">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-foreground">{foundCommunity.name}</h3>
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
                          <Users className="h-3 w-3" />
                          <span>{foundCommunity.members?.length || 0} Members</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-accent/5 rounded-full text-[9px] font-black text-accent uppercase tracking-widest">
                          <Sparkles className="h-3 w-3" />
                          <span>98% Sync</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium italic leading-relaxed px-4 line-clamp-2">
                        {foundCommunity.description || "A legendary community detected in the Verse node directory."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><Fingerprint className="h-12 w-12 text-primary" /></div>
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Identity Shield Active</span>
              <p className="text-[10px] text-muted-foreground font-medium italic">Joining as @{user?.displayName || "User"}. node path encrypted.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 bg-muted/10 border-t flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <CreatorFooter className="hidden sm:flex opacity-40 scale-90 origin-left" />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" className="flex-1 sm:flex-none rounded-xl font-black h-11 px-6 text-[10px] uppercase tracking-widest" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 sm:flex-none rounded-xl font-black h-11 px-10 shadow-xl shadow-primary/30 gap-2 uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-white"
              onClick={handleJoin}
              disabled={!foundCommunity || isJoining}
            >
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
              Sync into Verse
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
