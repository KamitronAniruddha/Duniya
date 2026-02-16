
"use client";

import { useState, useRef } from "react";
import { useFirestore, useUser, useMemoFirebase } from "@/firebase";
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

  const searchUsers = async () => {
    if (!db || searchQuery.trim().length < 2) return;
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
        disappearingMessagesDuration: disappearingDuration
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
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();
      
      toast({ title: "Verse Generated", description: `Welcome to ${name}!` });
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
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, x: -20 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-green-600 text-green-500 hover:text-white transition-all duration-150 shadow-md group">
          <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] w-[95vw] rounded-[3rem] p-0 overflow-hidden border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[80vh] max-h-[700px] flex flex-col font-body">
        {/* Wizard Header */}
        <header className="p-8 pb-6 bg-card border-b shrink-0 flex flex-col gap-6 relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><Sparkles className="h-24 w-24 text-primary" /></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary fill-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Verse Generation Engine</span>
              </div>
              <DialogTitle className="text-3xl font-[900] tracking-tighter uppercase leading-none">
                Construct <span className="text-primary italic">Universe</span>
              </DialogTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol v4.0</span>
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i === step ? "w-8 bg-primary" : "w-2 bg-muted", i < step && "bg-primary/40")} />
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-card/30">
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
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Avatar className="h-32 w-32 rounded-[2.5rem] border-4 border-background shadow-2xl relative z-10 transition-transform group-hover:scale-105 group-hover:rotate-2">
                          <AvatarImage src={iconURL} className="object-cover" />
                          <AvatarFallback className="bg-primary text-white text-5xl font-black">{name?.[0]?.toUpperCase() || <Globe className="h-12 w-12" />}</AvatarFallback>
                        </Avatar>
                        <button 
                          onClick={() => setIconMode(m => m === "url" ? "upload" : "url")}
                          className="absolute -bottom-2 -right-2 p-3 bg-primary rounded-2xl shadow-xl border-4 border-background text-white z-20 hover:scale-110 transition-all"
                        >
                          {iconMode === "url" ? <Link className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                        </button>
                      </div>
                      
                      <div className="flex-1 space-y-6 w-full">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Universal Descriptor (Name)</Label>
                          <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="e.g. Neo-Technica" 
                            className="bg-background border-none h-12 rounded-2xl font-black text-lg focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          />
                        </div>
                        {iconMode === "url" ? (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Icon Identity URL</Label>
                            <div className="relative">
                              <Link className="absolute left-4 top-3.5 h-4 w-4 text-primary/40" />
                              <Input 
                                value={iconURL} 
                                onChange={(e) => setIconURL(e.target.value)} 
                                placeholder="https://..." 
                                className="bg-background/50 border-none h-12 pl-11 rounded-2xl font-medium text-xs shadow-inner"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Media Signature</Label>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full h-12 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center gap-3 text-primary"
                            >
                              <ImagePlus className="h-5 w-5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Upload Custom Mark</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setIconURL(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} />
                          </div>
                        )}
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Universe Manifesto (Bio)</Label>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="What is the prime directive of this community?" 
                        className="bg-background border-none rounded-[2rem] font-medium min-h-[120px] px-6 py-4 focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-sm"
                      />
                    </motion.div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-8">
                    <motion.div variants={itemVariants} className="p-8 bg-background/50 rounded-[2.5rem] border border-border/50 space-y-6">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-accent/10 rounded-2xl text-accent group-hover:scale-110 transition-transform shadow-sm">
                            <Globe className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col">
                            <Label className="text-sm font-black uppercase tracking-tight">Broadcast Discovery</Label>
                            <p className="text-[10px] text-muted-foreground font-medium italic">Make this Universe visible in the Public Directory.</p>
                          </div>
                        </div>
                        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                      </div>

                      <div className="h-px bg-border/50 w-full" />

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                            <Timer className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col">
                            <Label className="text-sm font-black uppercase tracking-tight">Vanish Protocol (Ghost Mode)</Label>
                            <p className="text-[10px] text-muted-foreground font-medium italic">Automatically purge messages for absolute privacy.</p>
                          </div>
                        </div>
                        <Select value={disappearingDuration} onValueChange={setDisappearingDuration}>
                          <SelectTrigger className="w-full bg-background border-none h-14 rounded-2xl font-bold shadow-sm px-6">
                            <SelectValue placeholder="Select Vanish duration" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {DISAPPEARING_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-sm font-bold">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4">
                      <Shield className="h-10 w-10 text-primary opacity-40 shrink-0" />
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                        "Your community will be protected by standard Verse encryption protocols and high-fidelity identity verification."
                      </p>
                    </motion.div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Search Verse Entities</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-3.5 h-4 w-4 text-primary/40" />
                          <Input 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="Type @username to recruit..." 
                            className="bg-background border-none h-12 pl-11 rounded-2xl font-bold shadow-sm"
                            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                          />
                        </div>
                        <Button onClick={searchUsers} className="h-12 w-12 rounded-2xl shadow-lg shrink-0">
                          {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        </Button>
                      </div>
                    </motion.div>

                    <div className="min-h-[200px] space-y-4">
                      {searchResults.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 px-2">Discovery Results</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {searchResults.map((u) => {
                              const isInvited = selectedInvites.some(sel => sel.id === u.id);
                              return (
                                <button 
                                  key={u.id}
                                  onClick={() => toggleInvite(u)}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-2xl transition-all border text-left",
                                    isInvited ? "bg-primary/10 border-primary shadow-sm" : "bg-background border-transparent hover:bg-muted/50"
                                  )}
                                >
                                  <Avatar className="h-8 w-8 border shadow-sm">
                                    <AvatarImage src={u.photoURL} />
                                    <AvatarFallback className="bg-primary text-white font-black text-[10px]">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-bold flex-1 truncate">@{u.username}</span>
                                  {isInvited ? <Check className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground/40" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedInvites.length > 0 && (
                        <div className="space-y-2 animate-in fade-in zoom-in-95">
                          <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary px-2">Recruitment List</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedInvites.map(u => (
                              <Badge key={u.id} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-2 bg-primary text-white rounded-xl border-none shadow-md">
                                <Avatar className="h-5 w-5 border border-white/20">
                                  <AvatarImage src={u.photoURL} />
                                  <AvatarFallback className="text-[8px]">{u.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-black tracking-tight">@{u.username}</span>
                                <button onClick={() => toggleInvite(u)} className="hover:bg-white/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.length === 0 && selectedInvites.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center opacity-20 text-center gap-4">
                          <Users className="h-12 w-12" />
                          <p className="text-[9px] font-black uppercase tracking-[0.3em]">No participants staged</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Wizard Footer */}
        <DialogFooter className="p-8 bg-card border-t shrink-0 flex flex-row items-center justify-between gap-4">
          <CreatorFooter className="hidden sm:flex opacity-60" />
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {step > 0 && (
              <Button variant="ghost" className="rounded-xl font-bold h-12 px-6" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            )}
            
            {step < STEPS.length - 1 ? (
              <Button 
                className="flex-1 sm:flex-none rounded-2xl font-black h-12 px-10 shadow-xl shadow-primary/20 gap-2 uppercase tracking-widest"
                onClick={handleNext}
                disabled={step === 0 && !name.trim()}
              >
                Proceed <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                className="flex-1 sm:flex-none rounded-2xl font-black h-14 px-12 shadow-2xl shadow-primary/30 gap-2 uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-white"
                onClick={handleCreate}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
                Generate Universe
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
