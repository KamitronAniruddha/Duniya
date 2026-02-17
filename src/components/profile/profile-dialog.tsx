
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
  const [allowGroupInvites, setAllowGroupInvites] = useState(true);
  const [allowExternalAvatarEdit, setAllowExternalAvatarEdit] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [interfaceMode, setInterfaceMode] = useState("laptop");
  
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
      setAllowGroupInvites(userData.allowGroupInvites !== false);
      setAllowExternalAvatarEdit(!!userData.allowExternalAvatarEdit);
      setShowOnlineStatus(userData.showOnlineStatus !== false);
      setInterfaceMode(userData.interfaceMode || "laptop");
      
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
        allowGroupInvites,
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
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] w-[98vw] rounded-[3rem] overflow-hidden p-0 border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[90vh] max-h-[750px] flex flex-col font-body">
        <DialogHeader className="px-8 py-5 border-b bg-card shrink-0 flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <Fingerprint className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/60">Verse Identity Suite v2.0</span>
            </div>
            <DialogTitle className="text-2xl font-[900] tracking-tighter uppercase leading-none">
              Identity <span className="text-primary italic">Node</span>
            </DialogTitle>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-[0.2em] px-3 h-6">Node Active</Badge>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col md:flex-row overflow-hidden">
          <TabsList className="flex flex-row md:flex-col w-full md:w-[180px] md:h-full bg-muted/20 border-b md:border-b-0 md:border-r border-border/50 shrink-0 p-3 gap-1.5 overflow-x-auto custom-scrollbar md:justify-start">
            <TabsTrigger value="profile" className="flex-1 md:w-full justify-start gap-3 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative group">
              <User className="h-4 w-4 group-data-[state=active]:text-primary" /> <span>Identity</span>
              {activeTab === 'profile' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-primary/5 rounded-2xl -z-10" />}
            </TabsTrigger>
            <TabsTrigger value="ascension" className="flex-1 md:w-full justify-start gap-3 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative group">
              <Trophy className="h-4 w-4 group-data-[state=active]:text-primary" /> <span>Ascension</span>
              {activeTab === 'ascension' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-primary/5 rounded-2xl -z-10" />}
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 md:w-full justify-start gap-3 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative group">
              <ListOrdered className="h-4 w-4 group-data-[state=active]:text-primary" /> <span>Sovereigns</span>
              {activeTab === 'leaderboard' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-primary/5 rounded-2xl -z-10" />}
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex-1 md:w-full justify-start gap-3 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative group">
              <Palette className="h-4 w-4 group-data-[state=active]:text-primary" /> <span>Interface</span>
              {activeTab === 'interface' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-primary/5 rounded-2xl -z-10" />}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1 md:w-full justify-start gap-3 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative group">
              <ShieldCheck className="h-4 w-4 group-data-[state=active]:text-primary" /> <span>Shield</span>
              {activeTab === 'privacy' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-primary/5 rounded-2xl -z-10" />}
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 md:w-full justify-start gap-3 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all text-left relative group">
              <Key className="h-4 w-4 group-data-[state=active]:text-primary" /> <span>Access</span>
              {userData?.pendingProfileRequests?.length > 0 && <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 bg-rose-500 rounded-full animate-ping border-2 border-background" />}
              {activeTab === 'keys' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-primary/5 rounded-2xl -z-10" />}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 h-full overflow-hidden bg-card/30 backdrop-blur-sm relative">
            {/* Synapse Background Animation */}
            <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute -top-1/2 -left-1/2 w-full h-full border-[1px] border-primary/20 rounded-full border-dashed" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute -bottom-1/2 -right-1/2 w-full h-full border-[1px] border-accent/20 rounded-full border-dashed" />
            </div>

            <ScrollArea className="h-full relative z-10">
              <AnimatePresence mode="wait">
                <TabsContent key="tab-profile" value="profile" className="p-6 md:p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-8 p-8 bg-background/80 backdrop-blur-2xl rounded-[2.5rem] border border-border/50 shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-125 animate-pulse" />
                        <Avatar className="h-24 w-24 ring-8 ring-background shadow-2xl relative z-10 transition-transform duration-700 group-hover:scale-105">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="text-3xl bg-primary text-white font-black">{username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-2xl shadow-xl border-4 border-background text-white z-20 hover:scale-110 active:scale-95 transition-all">
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
                      <div className="flex-1 min-w-0 text-center sm:text-left relative z-10">
                        <div className="flex flex-col sm:flex-row items-center gap-3 mb-1.5">
                          <h4 className="font-black text-2xl tracking-tighter text-foreground truncate uppercase">@{userData?.username || username}</h4>
                          <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase px-3 h-6 shadow-lg shadow-primary/20">Level {userData?.level || 1}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60 truncate">{user?.email}</p>
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Identity Signature</Label>
                        <Input className="bg-background/60 border-none rounded-2xl h-12 font-[900] text-base px-6 focus:ring-4 focus:ring-primary/10 shadow-xl transition-all" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter signature..." />
                      </motion.div>
                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Media Node URL</Label>
                        <Input className="bg-background/40 border-none rounded-2xl h-12 font-medium text-xs px-6 focus:ring-4 focus:ring-primary/10 shadow-inner transition-all" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." />
                      </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-1">Persona Manifesto</Label>
                      <Textarea className="bg-background/60 border-none rounded-[2rem] font-medium min-h-[120px] px-8 py-5 focus:ring-4 focus:ring-primary/10 shadow-xl transition-all resize-none text-base leading-relaxed italic" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Define your existence..." />
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-ascension" value="ascension" className="p-6 md:p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
                    <XPVisualizer xp={userData?.xp || 0} />
                    <XPHistoryList userId={user?.uid || ""} />
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-leaderboard" value="leaderboard" className="p-0 m-0 outline-none h-full">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <GlobalLeaderboard />
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-interface" value="interface" className="p-6 md:p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
                    {INTERFACE_MODES.map((m) => (
                      <motion.button 
                        key={m.id} 
                        variants={itemVariants} 
                        onClick={() => setInterfaceMode(m.id)} 
                        className={cn(
                          "w-full flex items-center gap-6 p-6 rounded-[2rem] border transition-all text-left relative overflow-hidden group", 
                          interfaceMode === m.id ? "border-primary bg-primary/5 shadow-2xl scale-[1.02]" : "border-transparent bg-background/40 hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500", 
                          interfaceMode === m.id ? "bg-primary text-white shadow-xl shadow-primary/20 rotate-3" : "bg-muted text-muted-foreground group-hover:rotate-2"
                        )}>{m.icon}</div>
                        <div className="flex-1">
                          <span className="text-sm font-black uppercase tracking-[0.1em] block leading-none">{m.label} Protocol</span>
                          <span className="text-[11px] text-muted-foreground font-medium italic mt-1.5 block opacity-70">{m.desc}</span>
                        </div>
                        {interfaceMode === m.id && <Check className="h-6 w-6 text-primary animate-in zoom-in" />}
                      </motion.button>
                    ))}
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-privacy" value="privacy" className="p-6 md:p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <motion.div variants={itemVariants} className="p-8 bg-background/80 backdrop-blur-2xl rounded-[3rem] border border-border/50 space-y-6 shadow-2xl relative overflow-hidden">
                      <PrivacyToggle label="Identity Encryption" desc="Vanish from public node directories." icon={<Lock className="h-4 w-4 text-rose-500" />} checked={isProfileHidden} onChange={setIsProfileHidden} />
                      <Separator className="opacity-20" />
                      <PrivacyToggle label="Blur Field Intensity" desc="Force transient keys for profile masking." icon={<EyeOff className="h-4 w-4 text-amber-500" />} checked={isProfileBlurred} onChange={setIsProfileBlurred} />
                      <Separator className="opacity-20" />
                      <PrivacyToggle label="Live Presence Pulse" desc="Show 'On Screen' live synchronization status." icon={<Activity className="h-4 w-4 text-primary" />} checked={showOnlineStatus} onChange={setShowOnlineStatus} />
                      <Separator className="opacity-20" />
                      <PrivacyToggle label="Portal Manifestation" desc="Allow background community enlistments." icon={<Users className="h-4 w-4 text-blue-500" />} checked={allowGroupInvites} onChange={setAllowGroupInvites} />
                      <Separator className="opacity-20" />
                      <PrivacyToggle label="External Tuning" desc="Permit gifted identity looks from others." icon={<Sparkles className="h-4 w-4 text-cyan-500" />} checked={allowExternalAvatarEdit} onChange={setAllowExternalAvatarEdit} />
                      
                      <div className="pt-4 mt-4 bg-primary/5 rounded-[2rem] p-6 border border-primary/10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-emerald-500" /> Global Override
                            </Label>
                            <p className="text-[10px] text-muted-foreground italic">Temporarily bypass all masking protocols.</p>
                          </div>
                          <Switch checked={isGlobalAccessActive} onCheckedChange={setIsGlobalAccessActive} />
                        </div>
                        {isGlobalAccessActive && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pl-6 space-y-2">
                            <Label className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Handshake Duration</Label>
                            <Select value={globalDuration} onValueChange={setGlobalDuration}>
                              <SelectTrigger className="bg-background border-none h-11 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                <SelectValue placeholder="DURATION" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl">
                                {DURATIONS.map(d => (
                                  <SelectItem key={d.value} value={d.value.toString()} className="text-[10px] font-black uppercase p-3">
                                    {d.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-keys" value="keys" className="p-6 md:p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    {userData?.pendingProfileRequests?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {userData.pendingProfileRequests.map((req: any) => (
                          <motion.div key={req.uid} variants={itemVariants} className="p-6 bg-background/80 border border-border/50 rounded-[2rem] flex flex-col gap-5 shadow-xl group">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md group-hover:scale-105 transition-transform"><AvatarImage src={req.photoURL} /><AvatarFallback className="bg-primary text-white font-black text-sm">{req.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-primary rounded-full border-2 border-background flex items-center justify-center animate-pulse"><Zap className="h-2 w-2 text-white" /></div>
                              </div>
                              <div className="flex-1 min-w-0"><span className="text-sm font-black uppercase tracking-tight block truncate">@{req.username}</span><p className="text-[10px] text-muted-foreground italic truncate">Requesting review access.</p></div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Select onValueChange={(val) => handleApproveRequest(req, parseInt(val))}>
                                <SelectTrigger className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border-none rounded-2xl h-11 text-[10px] font-black uppercase tracking-widest transition-all"><SelectValue placeholder="GRANT ACCESS WINDOW" /></SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl">{DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-[10px] font-black uppercase tracking-widest p-3">{d.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-11 w-11 rounded-2xl text-destructive hover:bg-destructive/10 bg-destructive/5" onClick={() => handleDenyRequest(req)}><X className="h-5 w-5 stroke-[3px]" /></Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center gap-6"><Shield className="h-16 w-16 text-primary/40 animate-pulse" /><div className="space-y-1"><h4 className="text-xl font-[900] uppercase tracking-tighter">Zero Pending</h4><p className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Handshake Void</p></div></div>
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </ScrollArea>
          </div>
        </Tabs>

        <DialogFooter className="px-8 py-5 bg-card border-t shrink-0 flex flex-row items-center justify-between gap-4">
          <CreatorFooter className="hidden sm:flex opacity-60 scale-95 origin-left" />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" className="rounded-2xl font-[900] h-11 text-[10px] px-6 uppercase tracking-widest hover:bg-muted" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleUpdateProfile} className="flex-1 sm:flex-none rounded-2xl font-[900] h-11 text-[10px] px-10 shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] gap-3 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-5 w-5 stroke-[2.5px]" />}Sync Node</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyToggle({ label, desc, icon, checked, onChange }: { label: string; desc: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/10 transition-colors">{icon}</div>
        <div className="flex flex-col gap-0.5">
          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2">{label}</Label>
          <p className="text-[10px] text-muted-foreground italic font-medium opacity-70">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
