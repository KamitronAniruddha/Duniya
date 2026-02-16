
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
  Trash2, Search, X, Zap, Heart, Ghost, Timer
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
  const [selectedInvites, setSelectedInvites] = useState<any[]>([]);

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

  const toggleInvite = (user: any) => {
    setSelectedInvites(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) return prev.filter(u => u.id !== user.id);
      return [...prev, user];
    });
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
        admins: [],
        joinCode: joinCode,
        members: [user.uid],
        createdAt: new Date().toISOString(),
        isPublic: isPublic,
        disappearingMessagesDuration: disappearingDuration,
        isGenesis: true // Specialized flag for the new community invite look
      };
      
      batch.set(communityRef, communityData);

      // Create default general channel
      const channelRef = doc(collection(db, "communities", communityId, "channels"));
      batch.set(channelRef, {
        id: channelRef.id,
        communityId: communityId,
        name: "general",
        type: "text",
        createdAt: new Date().toISOString()
      });

      // Update user serverIds
      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, {
        serverIds: arrayUnion(communityId)
      });

      // Create owner member record
      batch.set(doc(db, "communities", communityId, "members", user.uid), {
        id: user.uid,
        communityId: communityId,
        userId: user.uid,
        role: "owner",
        joinedAt: new Date().toISOString()
      });

      // Send invitations to selected members
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
          type: "genesis", // Genesis Invitation Type
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
    visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.98 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-green-600 text-green-500 hover:text-white transition-all duration-150 shadow-md group">
          <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] w-[95vw] rounded-[3rem] p-0 overflow-hidden border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[85vh] max-h-[750px] flex flex-col font-body">
        {/* Synthesis Progress Header */}
        <header className="p-8 pb-6 bg-card border-b shrink-0 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none">
            <Sparkles className="h-32 w-32 text-primary animate-pulse" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 bg-primary/10 rounded-lg shadow-sm">
                  <Zap className="h-4 w-4 text-primary fill-primary animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Generation Protocol v5.0</span>
              </div>
              <DialogTitle className="text-4xl font-[900] tracking-tighter uppercase leading-none text-foreground">
                Synthesize <span className="text-primary italic">Verse</span>
              </DialogTitle>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Stage {step + 1} of {STEPS.length}
              </span>
              <div className="flex gap-2">
                {STEPS.map((_, i) => (
                  <div key={i} className={cn(
                    "h-1.5 rounded-full transition-all duration-700", 
                    i === step ? "w-12 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "w-3 bg-muted",
                    i < step && "bg-primary/40"
                  )} />
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-card/20">
          <ScrollArea className="h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-10 space-y-10"
              >
                {step === 0 && (
                  <div className="space-y-10">
                    <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-10 items-center lg:items-start">
                      <div className="relative group shrink-0">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="relative z-10">
                          <Avatar className="h-40 w-40 rounded-[3rem] border-8 border-background shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-3 bg-card flex items-center justify-center">
                            <AvatarImage src={iconURL} className="object-cover" />
                            <AvatarFallback className="bg-primary text-white text-6xl font-[900] uppercase">
                              {name?.[0] || <Globe className="h-16 w-16 opacity-20" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
                            <button 
                              onClick={() => setIconMode(m => m === "url" ? "upload" : "url")}
                              className="p-3.5 bg-primary rounded-2xl shadow-xl border-4 border-background text-white hover:scale-110 active:scale-95 transition-all z-20"
                              title="Toggle Mode"
                            >
                              {iconMode === "url" ? <Link className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-8 w-full">
                        <div className="space-y-3">
                          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1">Identity Signature (Name)</Label>
                          <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Type a legendary name..." 
                            className="bg-background border-none h-14 rounded-2xl font-[900] text-2xl focus:ring-4 focus:ring-primary/10 transition-all shadow-xl placeholder:opacity-30"
                          />
                        </div>
                        
                        {iconMode === "url" ? (
                          <motion.div variants={itemVariants} className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Icon Identity URL</Label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Link className="h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                              </div>
                              <Input 
                                value={iconURL} 
                                onChange={(e) => setIconURL(e.target.value)} 
                                placeholder="https://..." 
                                className="bg-background/50 border-none h-14 pl-12 rounded-2xl font-medium text-xs shadow-inner focus:bg-background transition-all"
                              />
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div variants={itemVariants} className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Direct Upload Protocol</Label>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center gap-4 text-primary group/upload"
                            >
                              <ImagePlus className="h-6 w-6 group-hover/upload:scale-110 transition-transform" />
                              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Initialize Media Transfer</span>
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

                    <motion.div variants={itemVariants} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Universe Manifesto (Bio)</Label>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">{description.length}/500</span>
                      </div>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Define the prime directive of this community. Why does it exist?" 
                        maxLength={500}
                        className="bg-background border-none rounded-[2.5rem] font-medium min-h-[160px] px-8 py-6 focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-xl text-lg leading-relaxed placeholder:opacity-20"
                      />
                    </motion.div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-10">
                    <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6">
                      <div className="p-8 bg-background/60 rounded-[3rem] border border-border/50 space-y-8 shadow-xl">
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-5">
                            <div className="p-4 bg-accent/10 rounded-[1.5rem] text-accent group-hover:scale-110 transition-transform shadow-sm">
                              <Globe className="h-7 w-7" />
                            </div>
                            <div className="flex flex-col">
                              <Label className="text-base font-black uppercase tracking-tight">Public Visibility</Label>
                              <p className="text-[11px] text-muted-foreground font-medium italic">Make this Universe discoverable in the Duniya Hub.</p>
                            </div>
                          </div>
                          <Switch checked={isPublic} onCheckedChange={setIsPublic} className="scale-125" />
                        </div>

                        <div className="h-px bg-border/30 w-full" />

                        <div className="space-y-5">
                          <div className="flex items-center gap-5">
                            <div className="p-4 bg-primary/10 rounded-[1.5rem] text-primary shadow-sm">
                              <Timer className="h-7 w-7" />
                            </div>
                            <div className="flex flex-col">
                              <Label className="text-base font-black uppercase tracking-tight">Vanish Protocol (Ghost Mode)</Label>
                              <p className="text-[11px] text-muted-foreground font-medium italic">Absolute privacy via automated content purging.</p>
                            </div>
                          </div>
                          <Select value={disappearingDuration} onValueChange={setDisappearingDuration}>
                            <SelectTrigger className="w-full bg-background border-none h-16 rounded-3xl font-black text-lg shadow-inner px-8">
                              <SelectValue placeholder="Select Vanish duration" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[2rem] border-none shadow-2xl p-2">
                              {DISAPPEARING_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-base font-bold py-3 rounded-xl">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-center gap-6 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:scale-110 transition-transform"><Shield className="h-24 w-24 text-primary" /></div>
                        <Shield className="h-12 w-12 text-primary opacity-40 shrink-0" />
                        <div className="space-y-1 relative z-10">
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Protocol Integrity</h4>
                          <p className="text-sm text-muted-foreground font-medium leading-relaxed italic pr-10">
                            "This Verse will be shielded by standard end-to-end encryption protocols and high-fidelity identity sync."
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-10">
                    <motion.div variants={itemVariants} className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Discover Verse Entities</Label>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Genesis Recruitment List</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="relative flex-1 group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                          </div>
                          <Input 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="Search by @handle..." 
                            className="bg-background border-none h-16 pl-12 rounded-3xl font-black text-xl shadow-xl transition-all placeholder:opacity-20"
                          />
                        </div>
                      </div>
                    </motion.div>

                    <div className="min-h-[300px] space-y-8">
                      <AnimatePresence mode="popLayout">
                        {searchResults.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-3"
                          >
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60 px-2 flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              Potential Matches
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {searchResults.map((u) => {
                                const isInvited = selectedInvites.some(sel => sel.id === u.id);
                                return (
                                  <motion.button 
                                    layout
                                    key={u.id}
                                    onClick={() => toggleInvite(u)}
                                    className={cn(
                                      "flex items-center gap-4 p-4 rounded-[1.75rem] transition-all border text-left group/result",
                                      isInvited ? "bg-primary/10 border-primary shadow-lg scale-[1.02]" : "bg-card/50 border-transparent hover:border-muted hover:bg-card"
                                    )}
                                  >
                                    <Avatar className="h-12 w-12 border-2 border-background shadow-md transition-transform group-hover/result:scale-110">
                                      <AvatarImage src={u.photoURL} className="object-cover" />
                                      <AvatarFallback className="bg-primary text-white font-[900] text-[12px]">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-sm font-black tracking-tight truncate">@{u.username}</span>
                                      <span className="text-[10px] text-muted-foreground font-medium truncate opacity-60 italic">{u.bio || "Duniya Citizen"}</span>
                                    </div>
                                    {isInvited ? (
                                      <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
                                        <Check className="h-4 w-4 stroke-[3px]" />
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground opacity-0 group-hover/result:opacity-100 transition-opacity">
                                        <Plus className="h-4 w-4" />
                                      </div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {selectedInvites.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 pt-4"
                          >
                            <div className="h-px bg-border/30 w-full" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary px-2">Recruitment Manifest</h4>
                            <div className="flex flex-wrap gap-2.5">
                              {selectedInvites.map(u => (
                                <motion.div 
                                  layout
                                  key={u.id}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="pl-1 pr-3 py-1 flex items-center gap-3 bg-primary text-white rounded-[1.25rem] border-none shadow-xl"
                                >
                                  <Avatar className="h-7 w-7 border-2 border-white/20">
                                    <AvatarImage src={u.photoURL} className="object-cover" />
                                    <AvatarFallback className="text-[10px] font-black">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-black tracking-tight">@{u.username}</span>
                                  <button onClick={() => toggleInvite(u)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {searchResults.length === 0 && selectedInvites.length === 0 && !isSearching && (
                        <div className="h-64 flex flex-col items-center justify-center opacity-20 text-center gap-6">
                          <div className="p-8 bg-muted rounded-[3rem] border border-border/50">
                            <Users className="h-16 w-16" />
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-[0.4em]">Node Staging Area — Clear</p>
                        </div>
                      )}
                      
                      {isSearching && (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-30">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Querying Verse Directory</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Unified Synthesis Footer */}
        <DialogFooter className="p-8 bg-card border-t shrink-0 flex flex-row items-center justify-between gap-6">
          <CreatorFooter className="hidden sm:flex opacity-40" />
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {step > 0 && (
              <Button variant="ghost" className="rounded-2xl font-black uppercase tracking-widest h-14 px-8 hover:bg-muted" onClick={handleBack} disabled={isLoading}>
                <ChevronLeft className="h-5 w-5 mr-2" /> Back
              </Button>
            )}
            
            {step < STEPS.length - 1 ? (
              <Button 
                className="flex-1 sm:flex-none rounded-[1.75rem] font-[900] h-16 px-12 shadow-2xl shadow-primary/20 gap-3 uppercase tracking-[0.2em] group/next"
                onClick={handleNext}
                disabled={step === 0 && !name.trim()}
              >
                Next Node <ChevronRight className="h-5 w-5 transition-transform group-hover/next:translate-x-1" />
              </Button>
            ) : (
              <Button 
                className="flex-1 sm:flex-none rounded-[1.75rem] font-[900] h-16 px-16 shadow-[0_20px_50px_rgba(var(--primary),0.3)] gap-3 uppercase tracking-[0.3em] bg-primary hover:bg-primary/90 text-white relative overflow-hidden"
                onClick={handleCreate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5 fill-current" />
                    Commit Genesis
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
