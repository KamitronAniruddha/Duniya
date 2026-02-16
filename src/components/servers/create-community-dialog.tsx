
"use client";

import { useState, useRef, useEffect } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, writeBatch, arrayUnion, query, where, getDocs, limit } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Loader2, Camera, Sparkles, Globe, Shield, Users, 
  Check, ArrowRight, ChevronRight, ChevronLeft, ImagePlus, Link, 
  Trash2, Search, X, Zap, Heart, Ghost, Timer, ShieldCheck, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreatorFooter } from "@/components/creator-footer";

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (serverId: string) => void;
}

const STEPS = ["Identity", "Core Logic", "Recruitment"];

const DISAPPEARING_OPTIONS = [
  { label: "Permanent Storage (Off)", value: "off" },
  { label: "Ghost Mode (24 Hours)", value: "24h" },
  { label: "Vanish Protocol (7 Days)", value: "7d" },
  { label: "Archive Cycle (90 Days)", value: "90d" },
];

interface Recipient {
  id: string;
  username: string;
  photoURL: string;
  role: "member" | "admin";
}

export function CreateCommunityDialog({ open, onOpenChange, onCreated }: CreateCommunityDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconURL, setIconURL] = useState("");
  const [iconMode, setIconMode] = useState<"url" | "upload">("upload");
  const [isPublic, setIsPublic] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState("off");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInvites, setSelectedInvites] = useState<Recipient[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateJoinCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  useEffect(() => {
    const searchUsers = async () => {
      if (!db || searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const q = query(
          collection(db, "users"),
          where("username", ">=", searchQuery.trim().toLowerCase()),
          where("username", "<=", searchQuery.trim().toLowerCase() + "\uf8ff"),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id }))
          .filter(u => u.id !== user?.uid);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, db, user?.uid]);

  const toggleInvite = (targetUser: any) => {
    setSelectedInvites(prev => {
      const isSelected = prev.some(u => u.id === targetUser.id);
      if (isSelected) return prev.filter(u => u.id !== targetUser.id);
      return [...prev, { 
        id: targetUser.id, 
        username: targetUser.username, 
        photoURL: targetUser.photoURL || "", 
        role: "member" 
      }];
    });
  };

  const toggleRole = (userId: string) => {
    setSelectedInvites(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role: u.role === "member" ? "admin" : "member" };
      }
      return u;
    }));
  };

  const handleCreate = async () => {
    if (!name.trim() || !user || !db) return;
    setIsLoading(true);

    try {
      const batch = writeBatch(db);
      const communityRef = doc(collection(db, "communities"));
      const communityId = communityRef.id;
      const joinCode = generateJoinCode();
      
      const communityData = {
        id: communityId,
        name: name.trim(),
        description: description.trim() || null,
        icon: iconURL || `https://picsum.photos/seed/${communityId}/400`,
        ownerId: user.uid,
        admins: selectedInvites.filter(i => i.role === "admin").map(i => i.id),
        joinCode: joinCode,
        members: [user.uid],
        createdAt: new Date().toISOString(),
        isPublic: isPublic,
        disappearingMessagesDuration: disappearingDuration,
        isGenesis: true
      };
      
      batch.set(communityRef, communityData);

      const channelRef = doc(collection(db, "communities", communityId, "channels"));
      batch.set(channelRef, {
        id: channelRef.id,
        communityId: communityId,
        name: "general",
        type: "text",
        createdAt: new Date().toISOString()
      });

      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, {
        serverIds: arrayUnion(communityId)
      });

      batch.set(doc(db, "communities", communityId, "members", user.uid), {
        id: user.uid,
        communityId: communityId,
        userId: user.uid,
        role: "owner",
        joinedAt: new Date().toISOString()
      });

      for (const invitee of selectedInvites) {
        const inviteId = `${communityId}_${invitee.id}`;
        batch.set(doc(db, "invitations", inviteId), {
          id: inviteId,
          targetUserId: invitee.id,
          targetUsername: invitee.username || "User",
          targetUserPhoto: invitee.photoURL || null,
          senderId: user.uid,
          senderName: user.displayName || "Duniya Admin",
          communityId: communityId,
          communityName: name.trim(),
          communityIcon: communityData.icon,
          status: "pending",
          type: "genesis",
          role: invitee.role, // Advanced: Different roles handled
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();
      
      toast({ title: "Verse Synthesized", description: `${name} has been brought into existence.` });
      onCreated(communityId);
      onOpenChange(false);
      resetForm();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Genesis Error", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setName("");
    setDescription("");
    setIconURL("");
    setIsPublic(false);
    setDisappearingDuration("off");
    setSelectedInvites([]);
    setSearchQuery("");
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.08 } },
    exit: { opacity: 0, scale: 0.98 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-green-600 text-green-500 hover:text-white transition-all duration-150 shadow-md group">
          <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] w-[95vw] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[85vh] max-h-[700px] flex flex-col font-body">
        <header className="px-8 py-6 bg-card border-b shrink-0 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Sparkles className="h-24 w-24 text-primary" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-primary/10 rounded-md">
                  <Zap className="h-3 w-3 text-primary fill-primary animate-pulse" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary/60">Generation Protocol v5.1</span>
              </div>
              <DialogTitle className="text-2xl font-[900] tracking-tighter uppercase leading-none text-foreground">
                Synthesize <span className="text-primary italic">Verse</span>
              </DialogTitle>
            </div>
            
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                Stage {step + 1} of {STEPS.length}
              </span>
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={cn(
                    "h-1 rounded-full transition-all duration-700", 
                    i === step ? "w-8 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "w-2 bg-muted",
                    i < step && "bg-primary/40"
                  )} />
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-card/10">
          <ScrollArea className="h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-8 space-y-8"
              >
                {step === 0 && (
                  <div className="space-y-8">
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                      <div className="relative group shrink-0">
                        <Avatar className="h-32 w-32 rounded-[2.5rem] border-4 border-background shadow-xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-2 bg-card flex items-center justify-center">
                          <AvatarImage src={iconURL} className="object-cover" />
                          <AvatarFallback className="bg-primary text-white text-4xl font-[900] uppercase">
                            {name?.[0] || <Globe className="h-12 w-12 opacity-20" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <button 
                            type="button"
                            onClick={() => setIconMode(m => m === "url" ? "upload" : "url")}
                            className="p-2.5 bg-primary rounded-xl shadow-lg border-2 border-background text-white hover:scale-110 transition-all z-20"
                          >
                            {iconMode === "url" ? <Link className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-6 w-full">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Identity Signature (Name)</Label>
                          <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="A legendary name..." 
                            className="bg-background border-none h-12 rounded-xl font-[900] text-lg focus:ring-2 focus:ring-primary/10 shadow-lg placeholder:opacity-30"
                          />
                        </div>
                        
                        {iconMode === "url" ? (
                          <motion.div variants={itemVariants} className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Icon Identity URL</Label>
                            <Input 
                              value={iconURL} 
                              onChange={(e) => setIconURL(e.target.value)} 
                              placeholder="https://..." 
                              className="bg-background/50 border-none h-11 px-4 rounded-xl font-medium text-xs shadow-inner focus:bg-background transition-all"
                            />
                          </motion.div>
                        ) : (
                          <motion.div variants={itemVariants} className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Media Transfer</Label>
                            <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full h-11 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center gap-3 text-primary group/upload"
                            >
                              <ImagePlus className="h-4 w-4 transition-transform group-hover/upload:scale-110" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Upload Icon</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setIconURL(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Universe Manifesto (Bio)</Label>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">{description.length}/500</span>
                      </div>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Define the prime directive of this community..." 
                        maxLength={500}
                        className="bg-background border-none rounded-[1.5rem] font-medium min-h-[120px] px-6 py-4 focus:ring-2 focus:ring-primary/10 shadow-lg text-sm leading-relaxed placeholder:opacity-20 resize-none"
                      />
                    </motion.div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-8">
                    <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4">
                      <div className="p-6 bg-background/60 rounded-[2rem] border border-border/50 space-y-6 shadow-lg">
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent shadow-sm">
                              <Globe className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <Label className="text-sm font-black uppercase tracking-tight">Public Visibility</Label>
                              <p className="text-[10px] text-muted-foreground italic">Discoverable in the Duniya Hub.</p>
                            </div>
                          </div>
                          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                        </div>

                        <Separator className="opacity-20" />

                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
                              <Timer className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <Label className="text-sm font-black uppercase tracking-tight">Vanish Protocol</Label>
                              <p className="text-[10px] text-muted-foreground italic">Automated content purging.</p>
                            </div>
                          </div>
                          <Select value={disappearingDuration} onValueChange={setDisappearingDuration}>
                            <SelectTrigger className="w-full bg-background border-none h-12 rounded-xl font-bold text-sm shadow-inner px-6">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              {DISAPPEARING_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-sm font-bold">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 flex items-center gap-4 relative overflow-hidden">
                        <Shield className="h-8 w-8 text-primary opacity-30 shrink-0" />
                        <div className="space-y-0.5">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Protocol Integrity</h4>
                          <p className="text-xs text-muted-foreground font-medium italic">
                            Encrypted nodes & high-fidelity identity sync active.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8">
                    <motion.div variants={itemVariants} className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Recruitment Manifest</Label>
                      <div className="relative group">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          placeholder="Search by @handle..." 
                          className="bg-background border-none h-11 pl-11 rounded-xl font-bold text-sm shadow-lg placeholder:opacity-30"
                        />
                      </div>
                    </motion.div>

                    <div className="min-h-[250px] space-y-6">
                      <AnimatePresence mode="popLayout">
                        {searchResults.length > 0 && (
                          <motion.div layout className="space-y-2">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 px-1">Universe Directory</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {searchResults.map((u) => {
                                const isInvited = selectedInvites.some(sel => sel.id === u.id);
                                return (
                                  <button 
                                    key={u.id}
                                    type="button"
                                    onClick={() => toggleInvite(u)}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl transition-all border text-left",
                                      isInvited ? "bg-primary/10 border-primary shadow-md" : "bg-card/50 border-transparent hover:border-muted"
                                    )}
                                  >
                                    <Avatar className="h-9 w-9 border shadow-sm">
                                      <AvatarImage src={u.photoURL} className="object-cover" />
                                      <AvatarFallback className="bg-primary text-white font-black text-[10px]">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-black block truncate">@{u.username}</span>
                                      <span className="text-[9px] text-muted-foreground italic truncate">Node Participant</span>
                                    </div>
                                    {isInvited ? <Check className="h-4 w-4 text-primary animate-in zoom-in" /> : <Plus className="h-4 w-4 text-muted-foreground opacity-40" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {selectedInvites.length > 0 && (
                        <motion.div layout className="space-y-3 pt-2">
                          <div className="h-px bg-border/20 w-full" />
                          <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary px-1">Enlistment Queue ({selectedInvites.length})</h4>
                          <div className="flex flex-col gap-2">
                            {selectedInvites.map(u => (
                              <div key={u.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/10 group">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 border border-white/20 shadow-sm">
                                    <AvatarImage src={u.photoURL} />
                                    <AvatarFallback className="text-[8px] font-black">{u.username?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">@{u.username}</span>
                                    <span className={cn(
                                      "text-[8px] font-black uppercase tracking-widest",
                                      u.role === "admin" ? "text-amber-600" : "text-primary/60"
                                    )}>
                                      {u.role === "admin" ? "Special Province Admin" : "Verse Citizen"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => toggleRole(u.id)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                                      u.role === "admin" 
                                        ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20" 
                                        : "bg-background text-muted-foreground border-border hover:border-primary/20"
                                    )}
                                  >
                                    {u.role === "admin" ? <ShieldCheck className="h-2.5 w-2.5 inline mr-1" /> : <Users className="h-2.5 w-2.5 inline mr-1" />}
                                    {u.role === "admin" ? "Admin" : "Promote"}
                                  </button>
                                  <button onClick={() => toggleInvite(u)} className="p-2 hover:bg-destructive/10 text-destructive rounded-xl transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {!isSearching && searchResults.length === 0 && selectedInvites.length === 0 && (
                        <div className="h-48 flex flex-col items-center justify-center opacity-20 text-center gap-4">
                          <Users className="h-10 w-10" />
                          <p className="text-[9px] font-black uppercase tracking-[0.3em]">Node Search Ready</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 bg-card border-t shrink-0 flex flex-row items-center justify-between gap-4">
          <CreatorFooter className="hidden sm:flex opacity-40 scale-90 origin-left" />
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {step > 0 && (
              <Button type="button" variant="ghost" className="rounded-xl font-black uppercase tracking-widest h-11 px-6 hover:bg-muted text-[10px]" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
            )}
            
            {step < STEPS.length - 1 ? (
              <Button 
                type="button"
                className="flex-1 sm:flex-none rounded-xl font-black h-11 px-8 shadow-lg shadow-primary/20 gap-2 uppercase tracking-widest text-[10px] group/next"
                onClick={handleNext}
                disabled={step === 0 && !name.trim()}
              >
                Next Node <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/next:translate-x-1" />
              </Button>
            ) : (
              <Button 
                type="button"
                className="flex-1 sm:flex-none rounded-xl font-black h-11 px-10 shadow-xl shadow-primary/30 gap-2 uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-white"
                onClick={handleCreate}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                Commit Genesis
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px bg-border", className)} />;
