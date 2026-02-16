"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc, arrayRemove, arrayUnion } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, User, Lock, Camera, ShieldAlert, Eye, EyeOff, Users, 
  Palette, Check, Upload, Link, Monitor, Tablet, Smartphone, 
  Sparkles, Trash2, Download, Heart, Maximize2, Shield, UserCheck, 
  X, Key, ImagePlus, Clock, Zap, Activity, Fingerprint, Globe, Waves, 
  ShieldCheck, Milestone, Trophy, MessageSquare, Star, ListOrdered, History
} from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorFooter } from "@/components/creator-footer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XPVisualizer } from "@/components/xp/xp-visualizer";
import { XPHistoryList } from "@/components/xp/xp-history-list";
import { GlobalLeaderboard } from "@/components/xp/global-leaderboard";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATIONS = [
  { label: "10 Minutes", value: 10 * 60 * 1000 },
  { label: "1 Hour", value: 60 * 60 * 1000 },
  { label: "24 Hours", value: 24 * 60 * 60 * 1000 },
  { label: "Session Only", value: 30 * 60 * 1000 },
];

const INTERFACE_MODES = [
  { id: 'laptop', label: 'Laptop', icon: <Monitor className="h-4 w-4" />, desc: 'Full desktop depth.' },
  { id: 'tablet', label: 'Tablet', icon: <Tablet className="h-4 w-4" />, desc: 'Hybrid sidebar nav.' },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-4 w-4" />, desc: 'Compact view.' },
];

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const [isLoading, setIsLoading] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isProfileHidden, setIsProfileHidden] = useState(false);
  const [isProfileBlurred, setIsProfileBlurred] = useState(false);
  const [interfaceMode, setInterfaceMode] = useState("laptop");
  const [allowExternalAvatarEdit, setAllowExternalAvatarEdit] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  
  const [isGlobalAccessActive, setIsGlobalAccessActive] = useState(false);
  const [globalDuration, setGlobalDuration] = useState("3600000");

  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (userData && open) {
      setUsername(userData.displayName || userData.username || "");
      setPhotoURL(userData.photoURL || "");
      setBio(userData.bio || "");
      setIsProfileHidden(!!userData.isProfileHidden);
      setIsProfileBlurred(!!userData.isProfileBlurred);
      setInterfaceMode(userData.interfaceMode || "laptop");
      setAllowExternalAvatarEdit(!!userData.allowExternalAvatarEdit);
      setShowOnlineStatus(userData.showOnlineStatus !== false);
      
      const now = new Date();
      const expiry = userData.globalAccessExpiry ? new Date(userData.globalAccessExpiry) : null;
      setIsGlobalAccessActive(!!expiry && expiry > now);
    }
  }, [userData, open]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      await updateProfile(user, { displayName: username.trim() });
      const userRef = doc(db, "users", user.uid);
      
      let globalExpiry = null;
      if (isGlobalAccessActive) {
        globalExpiry = new Date(Date.now() + parseInt(globalDuration)).toISOString();
      }

      updateDocumentNonBlocking(userRef, {
        displayName: username.trim(),
        photoURL: photoURL.trim() || null,
        bio: bio.trim() || null,
        interfaceMode,
        isProfileHidden,
        isProfileBlurred,
        allowExternalAvatarEdit,
        showOnlineStatus,
        globalAccessExpiry: globalExpiry,
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Identity Synchronized" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = (req: any, durationMs: number) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.uid);
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    updateDocumentNonBlocking(userRef, {
      authorizedViewers: arrayUnion({ uid: req.uid, expiresAt }),
      pendingProfileRequests: arrayRemove(req)
    });
    toast({ title: "Key Granted", description: `@${req.username} can review your identity.` });
  };

  const handleDenyRequest = (req: any) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.uid);
    updateDocumentNonBlocking(userRef, { pendingProfileRequests: arrayRemove(req) });
    toast({ title: "Request Terminated" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[950px] w-[98vw] rounded-[3rem] overflow-hidden p-0 border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[92vh] max-h-[850px] flex flex-col font-body">
        {/* Simplified Header */}
        <DialogHeader className="px-8 py-6 border-b bg-card shrink-0 flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <Fingerprint className="h-4 w-4 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Verse Identity Suite v4.0</span>
            </div>
            <DialogTitle className="text-2xl font-[1000] tracking-tighter uppercase leading-none">
              Identity <span className="text-primary italic">Node</span>
            </DialogTitle>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 shadow-sm">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Sovereign Protocol Active</span>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-row overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION - Optimized for many tabs */}
          <TabsList className="flex flex-col w-[220px] h-full bg-muted/20 border-r border-border/50 shrink-0 p-4 gap-1.5 justify-start">
            <TabsTrigger value="profile" className="w-full justify-start gap-3 px-4 py-3.5 rounded-2xl font-[900] text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left">
              <User className="h-4 w-4" /> Identity
            </TabsTrigger>
            <TabsTrigger value="ascension" className="w-full justify-start gap-3 px-4 py-3.5 rounded-2xl font-[900] text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left">
              <Trophy className="h-4 w-4" /> Ascension
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="w-full justify-start gap-3 px-4 py-3.5 rounded-2xl font-[900] text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left">
              <ListOrdered className="h-4 w-4" /> Sovereigns
            </TabsTrigger>
            <TabsTrigger value="interface" className="w-full justify-start gap-3 px-4 py-3.5 rounded-2xl font-[900] text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left">
              <Palette className="h-4 w-4" /> Interface
            </TabsTrigger>
            <TabsTrigger value="privacy" className="w-full justify-start gap-3 px-4 py-3.5 rounded-2xl font-[900] text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left">
              <ShieldCheck className="h-4 w-4" /> Shield
            </TabsTrigger>
            <TabsTrigger value="keys" className="w-full justify-start gap-3 px-4 py-3.5 rounded-2xl font-[900] text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative">
              <Key className="h-4 w-4" /> Access
              {userData?.pendingProfileRequests?.length > 0 && <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-background" />}
            </TabsTrigger>
            
            <div className="mt-auto pt-4 flex flex-col gap-2 opacity-40">
              <div className="h-px bg-border w-full mb-2" />
              <div className="flex items-center gap-2 px-2">
                <Shield className="h-3 w-3" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Sovereign Node Certified</span>
              </div>
            </div>
          </TabsList>
          
          {/* RIGHT SIDE CONTENT AREA */}
          <div className="flex-1 h-full overflow-hidden bg-card/30">
            <ScrollArea className="h-full">
              <AnimatePresence mode="wait">
                <TabsContent key="tab-profile" value="profile" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
                    <motion.div variants={itemVariants} className="flex items-center gap-8 p-8 bg-background/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-lg">
                      <div className="relative shrink-0 group/avatar">
                        <div className="absolute inset-[-10px] bg-primary/10 rounded-full blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700" />
                        <Avatar className="h-28 w-28 ring-[6px] ring-background shadow-2xl relative z-10">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="text-4xl bg-primary text-white font-[1000]">{username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="absolute -bottom-2 -right-2 p-3 bg-primary rounded-2xl shadow-xl border-4 border-background text-white z-20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhotoURL(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-[1000] text-3xl tracking-tighter text-foreground truncate">@{userData?.username || username}</h4>
                          <Badge className="bg-primary/10 text-primary border-none text-[9px] font-[900] uppercase h-5 px-3">L{userData?.level || 1}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-[900] uppercase tracking-[0.2em] opacity-60">{user?.email}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase px-2.5 h-6">Verified Node Participant</Badge>
                          <Badge variant="secondary" className="bg-accent/5 text-accent border-none text-[8px] font-black uppercase px-2.5 h-6">Duniya Sovereign</Badge>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Identity Signature</Label>
                        <Input 
                          className="bg-background border-none rounded-2xl h-14 font-[900] text-lg px-6 focus:ring-4 focus:ring-primary/5 shadow-xl transition-all" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder="Your identity..."
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Identity Node Media (URL)</Label>
                        <Input 
                          className="bg-background/50 border-none rounded-2xl h-14 font-medium text-xs px-6 focus:ring-4 focus:ring-primary/5 shadow-inner transition-all" 
                          value={photoURL} 
                          onChange={(e) => setPhotoURL(e.target.value)} 
                          placeholder="https://..."
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Digital Persona Manifesto (Bio)</Label>
                      <Textarea 
                        className="bg-background border-none rounded-[2rem] font-medium min-h-[140px] px-8 py-6 focus:ring-4 focus:ring-primary/5 shadow-xl transition-all resize-none text-base leading-relaxed" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="Share your prime directive with the Verse..."
                      />
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-ascension" value="ascension" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl shadow-lg">
                          <Trophy className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-xl font-[1000] uppercase tracking-tighter text-foreground leading-none">Ascension Board</h4>
                          <span className="text-[9px] font-[900] uppercase tracking-[0.3em] text-muted-foreground mt-1">Digital Lineage Intel v4.1</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase px-3 h-6 rounded-full">Rank: Grade AAA Sovereign</Badge>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase italic">Verified Node: 0x{userData?.id?.slice(0, 8)}</span>
                      </div>
                    </div>

                    <XPVisualizer xp={userData?.xp || 0} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-background border border-border/50 rounded-[2rem] space-y-2 group hover:border-primary/30 transition-all shadow-sm hover:shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Chatting Contributions</span>
                          <MessageSquare className="h-4 w-4 text-primary/40 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-[1000] text-foreground">{userData?.xpBreakdown?.chatting || 0}</span>
                          <span className="text-xs font-black text-primary uppercase">XP</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden mt-4">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (userData?.xpBreakdown?.chatting / 100))}%` }} className="h-full bg-primary" />
                        </div>
                      </div>
                      
                      <div className="p-6 bg-background border border-border/50 rounded-[2rem] space-y-2 group hover:border-accent/30 transition-all shadow-sm hover:shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-accent transition-colors">Presence Synchronization</span>
                          <Activity className="h-4 w-4 text-accent/40 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-[1000] text-foreground">{userData?.xpBreakdown?.presence || 0}</span>
                          <span className="text-xs font-black text-accent uppercase">XP</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden mt-4">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (userData?.xpBreakdown?.presence / 100))}%` }} className="h-full bg-accent" />
                        </div>
                      </div>
                    </div>

                    {/* XP History Component Integrated Directly */}
                    <div className="p-8 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] relative overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.02]"><History className="h-24 w-24" /></div>
                      <XPHistoryList userId={user?.uid || ""} />
                    </div>

                    <div className="p-8 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-[2.5rem] border-none flex items-center gap-6 relative overflow-hidden shadow-2xl group">
                      <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity"><Zap className="h-32 w-32 text-white fill-white" /></div>
                      <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                        <Star className="h-8 w-8 text-white fill-white animate-pulse" />
                      </div>
                      <div className="flex flex-col relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70 leading-none mb-2">Sync Streak Integrity</span>
                        <span className="text-4xl font-[1000] text-white italic tracking-tighter leading-none">{userData?.loginStreak || 0} CONTINUOUS DAYS</span>
                        <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] mt-2 italic">Maintain connection to amplify ascension velocity.</p>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-leaderboard" value="leaderboard" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <div className="flex items-center justify-between px-2 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl shadow-lg">
                          <Crown className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-2xl font-[1000] uppercase tracking-tighter text-foreground leading-none">Global Hall of Legends</h4>
                          <span className="text-[9px] font-[900] uppercase tracking-[0.3em] text-muted-foreground mt-1">Cross-Verse Sovereign Hierarchy</span>
                        </div>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-2xl border border-border/50">
                        <ListOrdered className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="bg-background/40 backdrop-blur-2xl rounded-[3rem] border border-border/50 shadow-2xl p-2 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                      <GlobalLeaderboard />
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-interface" value="interface" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <div className="flex items-center gap-4 px-2 mb-2">
                      <div className="p-2 bg-primary/10 rounded-xl"><Monitor className="h-5 w-5 text-primary" /></div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-foreground">UI Environment Synch</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {INTERFACE_MODES.map((m) => (
                        <motion.button 
                          key={m.id}
                          variants={itemVariants}
                          onClick={() => setInterfaceMode(m.id)} 
                          className={cn(
                            "w-full flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all text-left group",
                            interfaceMode === m.id ? "border-primary bg-primary/5 shadow-xl" : "border-transparent bg-background/50 hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                            interfaceMode === m.id ? "bg-primary text-white scale-110 shadow-primary/20" : "bg-muted text-muted-foreground"
                          )}>
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <span className="text-base font-black uppercase tracking-tight block leading-none">{m.label} Protocol</span>
                            <span className="text-xs text-muted-foreground font-medium italic mt-1 block">{m.desc}</span>
                          </div>
                          {interfaceMode === m.id && (
                            <motion.div layoutId="mode-check" className="p-2 bg-primary/10 rounded-full">
                              <Check className="h-5 w-5 text-primary animate-in zoom-in" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-privacy" value="privacy" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <motion.div variants={itemVariants} className="p-8 bg-background/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 space-y-6 shadow-xl">
                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2.5">
                            <Lock className="h-4 w-4 text-rose-500" /> Identity Encryption Node
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic max-w-[280px]">Activate @phide protocol to vanish from public node directories.</p>
                        </div>
                        <Switch checked={isProfileHidden} onCheckedChange={setIsProfileHidden} />
                      </div>
                      
                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2.5">
                            <EyeOff className="h-4 w-4 text-amber-500" /> Blur Field Intensity
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic max-w-[280px]">Force transient keys via @porn protocol for identity masking.</p>
                        </div>
                        <Switch checked={isProfileBlurred} onCheckedChange={setIsProfileBlurred} />
                      </div>

                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2.5 text-emerald-600">
                            <ImagePlus className="h-4 w-4" /> Identity Gift Acceptance
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic max-w-[280px]">Allow Verse citizens to 'Gift a Look' to your identity node.</p>
                        </div>
                        <Switch checked={allowExternalAvatarEdit} onCheckedChange={setAllowExternalAvatarEdit} />
                      </div>

                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2.5 text-primary">
                            <Activity className="h-4 w-4" /> Live Presence Pulse
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic max-w-[280px]">Show 'On Screen' live status across all synchronized communities.</p>
                        </div>
                        <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 space-y-6 relative overflow-hidden shadow-inner">
                      <div className="absolute -top-4 -right-4 p-8 opacity-[0.03]"><Globe className="h-24 w-24 text-primary" /></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-sm font-black uppercase text-primary tracking-widest">Global Broadcast Window</Label>
                          <p className="text-[10px] text-muted-foreground italic">Temporary full unmask for ALL citizens during events.</p>
                        </div>
                        <Switch checked={isGlobalAccessActive} onCheckedChange={setIsGlobalAccessActive} />
                      </div>
                      {isGlobalAccessActive && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 relative z-10 space-y-3">
                          <Label className="text-[9px] font-black uppercase text-primary tracking-[0.3em] ml-1">Sync window duration</Label>
                          <Select value={globalDuration} onValueChange={setGlobalDuration}>
                            <SelectTrigger className="bg-background/80 border-none rounded-2xl h-14 text-xs font-black shadow-lg px-6 uppercase tracking-widest">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-[10px] font-black uppercase tracking-widest p-3">{d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-keys" value="keys" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                      <div className="p-2 bg-primary/10 rounded-xl"><Key className="h-5 w-5 text-primary" /></div>
                      <div className="flex flex-col">
                        <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Access Key Management</h4>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">Verified Identity Handshakes</span>
                      </div>
                    </div>

                    {userData?.pendingProfileRequests?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {userData.pendingProfileRequests.map((req: any) => (
                          <motion.div key={req.uid} variants={itemVariants} className="p-6 bg-background border border-border/50 rounded-[2rem] flex flex-col gap-6 shadow-lg group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="h-14 w-14 border shadow-sm group-hover:scale-105 transition-transform"><AvatarImage src={req.photoURL} /><AvatarFallback className="bg-primary text-white font-[1000] text-sm">{req.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                                <div className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full text-white border-2 border-background"><Zap className="h-2 w-2 fill-current" /></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-black uppercase tracking-tighter block truncate leading-none">@{req.username}</span>
                                <p className="text-[10px] text-muted-foreground italic truncate mt-1">Requesting high-fidelity identity review access.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Select onValueChange={(val) => handleApproveRequest(req, parseInt(val))}>
                                <SelectTrigger className="flex-1 bg-primary/5 hover:bg-primary/10 border-none rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest transition-all">
                                  <SelectValue placeholder="GRANT ACCESS WINDOW" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-[10px] font-black uppercase tracking-widest p-3">{d.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/10" onClick={() => handleDenyRequest(req)}><X className="h-5 w-5 stroke-[3px]" /></Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center gap-6">
                        <div className="relative">
                          <Shield className="h-20 w-20" />
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] leading-none">Zero Pending Handshakes</p>
                          <p className="text-[8px] font-bold uppercase opacity-60">Identity node secure and restricted.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </ScrollArea>
          </div>
        </Tabs>

        {/* Unified Footer */}
        <DialogFooter className="px-10 py-8 bg-muted/10 border-t shrink-0 flex flex-row items-center justify-between gap-6">
          <div className="hidden sm:flex flex-col gap-1 items-start">
            <CreatorFooter className="opacity-60 scale-110 origin-left" />
            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-4">Secure Synchronized Identity Session</span>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button variant="ghost" className="rounded-2xl font-black h-14 text-[10px] px-10 uppercase tracking-widest hover:bg-muted" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel Node Update</Button>
            <Button 
              onClick={handleUpdateProfile} 
              className="flex-1 sm:flex-none rounded-2xl font-black h-14 text-[10px] px-14 shadow-[0_20px_50px_rgba(var(--primary),0.3)] uppercase tracking-[0.2em] gap-3 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5 stroke-[2.5px]" />}
              Commit Node Sync
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
