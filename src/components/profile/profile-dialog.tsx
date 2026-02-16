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
  ShieldCheck, Milestone, Trophy, MessageSquare, Star, ListOrdered, History,
  Crown
} from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <DialogContent className="sm:max-w-[900px] w-[98vw] rounded-[2.5rem] overflow-hidden p-0 border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[90vh] max-h-[800px] flex flex-col font-body">
        {/* Simplified Header */}
        <DialogHeader className="px-6 py-4 border-b bg-card shrink-0 flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <Fingerprint className="h-3.5 w-3.5 text-primary" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/60">Verse Identity Suite v4.0</span>
            </div>
            <DialogTitle className="text-xl font-black tracking-tighter uppercase leading-none">
              Identity <span className="text-primary italic">Node</span>
            </DialogTitle>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Sovereign Protocol Active</span>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION */}
          <TabsList className="flex flex-row md:flex-col w-full md:w-[180px] md:h-full bg-muted/20 border-b md:border-b-0 md:border-r border-border/50 shrink-0 p-2 md:p-3 gap-1 overflow-x-auto custom-scrollbar md:justify-start">
            <TabsTrigger value="profile" className="flex-1 md:w-full justify-start gap-2.5 px-3 py-2 md:py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <User className="h-3.5 w-3.5" /> <span className="hidden md:inline">Identity</span>
            </TabsTrigger>
            <TabsTrigger value="ascension" className="flex-1 md:w-full justify-start gap-2.5 px-3 py-2 md:py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <Trophy className="h-3.5 w-3.5" /> <span className="hidden md:inline">Ascension</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 md:w-full justify-start gap-2.5 px-3 py-2 md:py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <ListOrdered className="h-3.5 w-3.5" /> <span className="hidden md:inline">Sovereigns</span>
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex-1 md:w-full justify-start gap-2.5 px-3 py-2 md:py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <Palette className="h-3.5 w-3.5" /> <span className="hidden md:inline">Interface</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 md:w-full justify-start gap-2.5 px-3 py-2 md:py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <ShieldCheck className="h-3.5 w-3.5" /> <span className="hidden md:inline">Shield</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 md:w-full justify-start gap-2.5 px-3 py-2 md:py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left relative">
              <Key className="h-3.5 w-3.5" /> <span className="hidden md:inline">Access</span>
              {userData?.pendingProfileRequests?.length > 0 && <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-rose-500 rounded-full animate-pulse border border-background" />}
            </TabsTrigger>
          </TabsList>
          
          {/* RIGHT SIDE CONTENT AREA */}
          <div className="flex-1 h-full overflow-hidden bg-card/30">
            <ScrollArea className="h-full">
              <AnimatePresence mode="wait">
                <TabsContent key="tab-profile" value="profile" className="p-4 md:p-6 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 md:space-y-8">
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-background/60 backdrop-blur-xl rounded-[2rem] border border-border/50 shadow-md">
                      <div className="relative shrink-0 group/avatar">
                        <div className="absolute inset-[-8px] bg-primary/10 rounded-full blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700" />
                        <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl relative z-10">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-primary text-white font-black">{username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-xl shadow-lg border-2 border-background text-white z-20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Camera className="h-4 w-4" />
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
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-2 mb-0.5">
                          <h4 className="font-black text-xl tracking-tighter text-foreground truncate max-w-full">@{userData?.username || username}</h4>
                          <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase h-4.5 px-2">L{userData?.level || 1}</Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 truncate">{user?.email}</p>
                        <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-1.5">
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[7px] font-black uppercase px-2 h-5">Verified Participant</Badge>
                          <Badge variant="secondary" className="bg-accent/5 text-accent border-none text-[7px] font-black uppercase px-2 h-5">Duniya Sovereign</Badge>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary ml-1">Identity Signature (Name)</Label>
                        <Input 
                          className="bg-background border-none rounded-xl h-11 font-black text-base px-4 focus:ring-2 focus:ring-primary/10 shadow-sm transition-all" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder="Your identity..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Identity Node Media (URL)</Label>
                        <Input 
                          className="bg-background/50 border-none rounded-xl h-11 font-medium text-xs px-4 focus:ring-2 focus:ring-primary/10 shadow-inner transition-all" 
                          value={photoURL} 
                          onChange={(e) => setPhotoURL(e.target.value)} 
                          placeholder="https://..."
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary ml-1">Persona Manifesto (Bio)</Label>
                      <Textarea 
                        className="bg-background border-none rounded-2xl font-medium min-h-[100px] px-5 py-4 focus:ring-2 focus:ring-primary/10 shadow-sm transition-all resize-none text-sm leading-relaxed" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="Share your prime directive with the Verse..."
                      />
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-ascension" value="ascension" className="p-4 md:p-6 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl shadow-md">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-lg font-black uppercase tracking-tighter text-foreground leading-none">Ascension Board</h4>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Digital Lineage Intel v4.1</span>
                        </div>
                      </div>
                      <Badge className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase px-2.5 h-5 rounded-full">Grade AAA Sovereign</Badge>
                    </div>

                    <XPVisualizer xp={userData?.xp || 0} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-background border border-border/50 rounded-2xl space-y-1.5 group hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Chatting Contributions</span>
                          <MessageSquare className="h-3.5 w-3.5 text-primary/40" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-foreground">{userData?.xpBreakdown?.chatting || 0}</span>
                          <span className="text-[9px] font-black text-primary uppercase">XP</span>
                        </div>
                        <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden mt-3">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (userData?.xpBreakdown?.chatting / 100))}%` }} className="h-full bg-primary" />
                        </div>
                      </div>
                      
                      <div className="p-5 bg-background border border-border/50 rounded-2xl space-y-1.5 group hover:border-accent/30 transition-all shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-accent">Presence Synchronization</span>
                          <Activity className="h-3.5 w-3.5 text-accent/40" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-foreground">{userData?.xpBreakdown?.presence || 0}</span>
                          <span className="text-[9px] font-black text-accent uppercase">XP</span>
                        </div>
                        <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden mt-3">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (userData?.xpBreakdown?.presence / 100))}%` }} className="h-full bg-accent" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-6 bg-background border border-dashed border-border/50 rounded-2xl relative overflow-hidden shadow-inner">
                      <XPHistoryList userId={user?.uid || ""} />
                    </div>

                    <div className="p-6 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-[2rem] border-none flex items-center gap-5 relative overflow-hidden shadow-xl">
                      <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <Star className="h-6 w-6 text-white fill-white animate-pulse" />
                      </div>
                      <div className="flex flex-col relative z-10">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/70 leading-none mb-1">Sync Streak</span>
                        <span className="text-xl md:text-2xl font-black text-white italic tracking-tighter leading-none">{userData?.loginStreak || 0} CONTINUOUS DAYS</span>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-leaderboard" value="leaderboard" className="p-4 md:p-6 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="p-2 bg-amber-500/10 rounded-xl shadow-md">
                        <Crown className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-lg font-black uppercase tracking-tighter text-foreground leading-none">Global Hall of Legends</h4>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Sovereign Hierarchy</span>
                      </div>
                    </div>
                    
                    <div className="bg-background/40 backdrop-blur-2xl rounded-[2.5rem] border border-border/50 shadow-xl p-1 relative overflow-hidden">
                      <GlobalLeaderboard />
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-interface" value="interface" className="p-4 md:p-6 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <div className="p-2 bg-primary/10 rounded-xl"><Monitor className="h-4 w-4 text-primary" /></div>
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground">UI Environment Sync</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {INTERFACE_MODES.map((m) => (
                        <motion.button 
                          key={m.id}
                          variants={itemVariants}
                          onClick={() => setInterfaceMode(m.id)} 
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                            interfaceMode === m.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-background/50 hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                            interfaceMode === m.id ? "bg-primary text-white scale-105 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                          )}>
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-black uppercase tracking-tight block leading-none">{m.label} Protocol</span>
                            <span className="text-[10px] text-muted-foreground font-medium italic mt-1 block">{m.desc}</span>
                          </div>
                          {interfaceMode === m.id && (
                            <Check className="h-4 w-4 text-primary animate-in zoom-in" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-privacy" value="privacy" className="p-4 md:p-6 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <motion.div variants={itemVariants} className="p-6 bg-background/60 backdrop-blur-xl rounded-2xl border border-border/50 space-y-5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-rose-500" /> Identity Encryption
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Vanish from public node directories.</p>
                        </div>
                        <Switch checked={isProfileHidden} onCheckedChange={setIsProfileHidden} />
                      </div>
                      
                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                            <EyeOff className="h-3.5 w-3.5 text-amber-500" /> Blur Field Intensity
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Force transient keys for identity masking.</p>
                        </div>
                        <Switch checked={isProfileBlurred} onCheckedChange={setIsProfileBlurred} />
                      </div>

                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2 text-emerald-600">
                            <ImagePlus className="h-3.5 w-3.5" /> Identity Gift Acceptance
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Allow citizens to 'Gift a Look' to your node.</p>
                        </div>
                        <Switch checked={allowExternalAvatarEdit} onCheckedChange={setAllowExternalAvatarEdit} />
                      </div>

                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2 text-primary">
                            <Activity className="h-3.5 w-3.5" /> Live Presence Pulse
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Show 'On Screen' live status.</p>
                        </div>
                        <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="p-6 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 space-y-4 shadow-inner">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase text-primary tracking-widest">Global Broadcast Window</Label>
                          <p className="text-[9px] text-muted-foreground italic">Temporary unmask for ALL citizens during events.</p>
                        </div>
                        <Switch checked={isGlobalAccessActive} onCheckedChange={setIsGlobalAccessActive} />
                      </div>
                      {isGlobalAccessActive && (
                        <div className="pt-1 animate-in fade-in slide-in-from-top-2 space-y-2">
                          <Label className="text-[8px] font-black uppercase text-primary tracking-[0.2em] ml-1">Sync window duration</Label>
                          <Select value={globalDuration} onValueChange={setGlobalDuration}>
                            <SelectTrigger className="bg-background/80 border-none rounded-xl h-10 text-[10px] font-black shadow-md px-4 uppercase tracking-widest">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-[9px] font-black uppercase tracking-widest p-2.5">{d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-keys" value="keys" className="p-4 md:p-6 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <div className="p-2 bg-primary/10 rounded-xl"><Key className="h-4 w-4 text-primary" /></div>
                      <div className="flex flex-col">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground">Access Key Management</h4>
                        <span className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5">Verified Handshakes</span>
                      </div>
                    </div>

                    {userData?.pendingProfileRequests?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {userData.pendingProfileRequests.map((req: any) => (
                          <motion.div key={req.uid} variants={itemVariants} className="p-5 bg-background border border-border/50 rounded-2xl flex flex-col gap-4 shadow-md group transition-all">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-11 w-11 border shadow-sm group-hover:scale-105 transition-transform"><AvatarImage src={req.photoURL} /><AvatarFallback className="bg-primary text-white font-black text-xs">{req.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-black uppercase tracking-tighter block truncate leading-none">@{req.username}</span>
                                <p className="text-[9px] text-muted-foreground italic truncate mt-1">Requesting high-fidelity review access.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select onValueChange={(val) => handleApproveRequest(req, parseInt(val))}>
                                <SelectTrigger className="flex-1 bg-primary/5 hover:bg-primary/10 border-none rounded-xl h-10 text-[9px] font-black uppercase tracking-widest transition-all">
                                  <SelectValue placeholder="GRANT ACCESS WINDOW" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-[9px] font-black uppercase tracking-widest p-2.5">{d.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDenyRequest(req)}><X className="h-4 w-4 stroke-[3px]" /></Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 opacity-20 text-center gap-4">
                        <Shield className="h-14 w-14" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-none">Zero Pending Handshakes</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </ScrollArea>
          </div>
        </Tabs>

        {/* Unified Footer */}
        <DialogFooter className="px-6 md:px-8 py-4 md:py-5 bg-muted/10 border-t shrink-0 flex flex-row items-center justify-between gap-4">
          <div className="hidden sm:flex items-center">
            <CreatorFooter className="opacity-60 scale-90 origin-left" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" className="rounded-xl font-bold h-10 md:h-11 text-[9px] px-4 md:px-6 uppercase tracking-widest hover:bg-muted" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel Update</Button>
            <Button 
              onClick={handleUpdateProfile} 
              className="flex-1 sm:flex-none rounded-xl font-black h-10 md:h-11 text-[9px] px-6 md:px-10 shadow-lg shadow-primary/20 uppercase tracking-[0.15em] gap-2.5 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 stroke-[2.5px]" />}
              Commit Node Sync
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
