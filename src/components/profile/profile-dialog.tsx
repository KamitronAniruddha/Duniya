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
  ShieldCheck, Milestone
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
      <DialogContent className="sm:max-w-[850px] w-[95vw] rounded-[2rem] overflow-hidden p-0 border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[85vh] max-h-[700px] flex flex-col font-body">
        {/* Simplified Header */}
        <DialogHeader className="px-8 py-6 border-b bg-card shrink-0 flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <Fingerprint className="h-4 w-4 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Verse Identity Suite v3.0</span>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase leading-none">
              Identity <span className="text-primary italic">Node</span>
            </DialogTitle>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Secure Interaction</span>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-row overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION */}
          <TabsList className="flex flex-col w-[200px] h-full bg-muted/20 border-r border-border/50 shrink-0 p-4 gap-1 justify-start">
            <TabsTrigger value="profile" className="w-full justify-start gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <User className="h-4 w-4" /> Identity
            </TabsTrigger>
            <TabsTrigger value="interface" className="w-full justify-start gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <Palette className="h-4 w-4" /> Interface
            </TabsTrigger>
            <TabsTrigger value="privacy" className="w-full justify-start gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left">
              <ShieldCheck className="h-4 w-4" /> Shield
            </TabsTrigger>
            <TabsTrigger value="keys" className="w-full justify-start gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all text-left relative">
              <Key className="h-4 w-4" /> Access
              {userData?.pendingProfileRequests?.length > 0 && <span className="absolute top-3 right-3 h-2 w-2 bg-rose-500 rounded-full animate-pulse" />}
            </TabsTrigger>
            
            <div className="mt-auto pt-4 flex flex-col gap-2 opacity-40">
              <div className="h-px bg-border w-full mb-2" />
              <div className="flex items-center gap-2 px-2">
                <Shield className="h-3 w-3" />
                <span className="text-[8px] font-black uppercase">Verified State</span>
              </div>
            </div>
          </TabsList>
          
          {/* RIGHT SIDE CONTENT AREA */}
          <div className="flex-1 h-full overflow-hidden bg-card/30">
            <ScrollArea className="h-full">
              <AnimatePresence mode="wait">
                <TabsContent key="tab-profile" value="profile" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <motion.div variants={itemVariants} className="flex items-center gap-6 p-6 bg-background/50 rounded-3xl border border-border/50">
                      <div className="relative shrink-0 group/avatar">
                        <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="text-3xl bg-primary text-white font-black">{username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-xl shadow-lg border-2 border-background text-white z-20 hover:scale-110 transition-all"
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
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xl tracking-tight text-foreground truncate">@{userData?.username || username}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{user?.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase">Node Participant</Badge>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</Label>
                        <Input 
                          className="bg-background border-none rounded-xl h-11 font-bold text-sm px-4 focus:ring-2 focus:ring-primary/20 transition-all" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder="Your identity..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity URL</Label>
                        <Input 
                          className="bg-background border-none rounded-xl h-11 font-medium text-xs px-4 focus:ring-2 focus:ring-primary/20 transition-all" 
                          value={photoURL} 
                          onChange={(e) => setPhotoURL(e.target.value)} 
                          placeholder="https://..."
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Digital Persona Bio</Label>
                      <Textarea 
                        className="bg-background border-none rounded-2xl font-medium min-h-[100px] px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="Share your thoughts with the Verse..."
                      />
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-interface" value="interface" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <div className="flex items-center gap-3 px-2 mb-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-foreground">UI Environment</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {INTERFACE_MODES.map((m) => (
                        <motion.button 
                          key={m.id}
                          variants={itemVariants}
                          onClick={() => setInterfaceMode(m.id)} 
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                            interfaceMode === m.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-background/50 hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                            interfaceMode === m.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-black uppercase tracking-tight block leading-none">{m.label} Mode</span>
                            <span className="text-[10px] text-muted-foreground font-medium italic mt-1 block">{m.desc}</span>
                          </div>
                          {interfaceMode === m.id && <Check className="h-4 w-4 text-primary animate-in zoom-in" />}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-privacy" value="privacy" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <motion.div variants={itemVariants} className="p-6 bg-background/50 rounded-3xl border border-border/50 space-y-5">
                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-rose-500" /> Identity Encryption
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Activate @phide protocol to vanish.</p>
                        </div>
                        <Switch checked={isProfileHidden} onCheckedChange={setIsProfileHidden} />
                      </div>
                      
                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                            <EyeOff className="h-3.5 w-3.5 text-amber-500" /> Blur Protocol
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Force transient keys via @porn protocol.</p>
                        </div>
                        <Switch checked={isProfileBlurred} onCheckedChange={setIsProfileBlurred} />
                      </div>

                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                            <ImagePlus className="h-3.5 w-3.5 text-emerald-500" /> Collaborative Look
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Allow others to 'Gift a Look'.</p>
                        </div>
                        <Switch checked={allowExternalAvatarEdit} onCheckedChange={setAllowExternalAvatarEdit} />
                      </div>

                      <Separator className="opacity-20" />

                      <div className="flex items-center justify-between group">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase tracking-tight flex items-center gap-2 text-primary">
                            <Activity className="h-3.5 w-3.5" /> Presence Broadcast
                          </Label>
                          <p className="text-[9px] text-muted-foreground italic">Show 'On Screen' live status.</p>
                        </div>
                        <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-4 relative overflow-hidden">
                      <div className="absolute -top-4 -right-4 p-8 opacity-[0.03]"><Globe className="h-16 w-16 text-primary" /></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-black uppercase text-primary tracking-tight">Identity Broadcast</Label>
                          <p className="text-[9px] text-muted-foreground italic">Temporary unmask for ALL members.</p>
                        </div>
                        <Switch checked={isGlobalAccessActive} onCheckedChange={setIsGlobalAccessActive} />
                      </div>
                      {isGlobalAccessActive && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 relative z-10 space-y-2">
                          <Label className="text-[8px] font-black uppercase text-primary tracking-[0.2em] ml-1">Broadcast window</Label>
                          <Select value={globalDuration} onValueChange={setGlobalDuration}>
                            <SelectTrigger className="bg-background/80 border-none rounded-xl h-10 text-[10px] font-bold shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-xs font-bold">{d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </TabsContent>

                <TabsContent key="tab-keys" value="keys" className="p-8 m-0 outline-none">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <Key className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Access Management</h4>
                    </div>

                    {userData?.pendingProfileRequests?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {userData.pendingProfileRequests.map((req: any) => (
                          <motion.div key={req.uid} variants={itemVariants} className="p-4 bg-background border border-border/50 rounded-2xl flex flex-col gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={req.photoURL} /><AvatarFallback className="bg-primary text-white font-black text-xs">{req.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-black uppercase tracking-tight block truncate">@{req.username}</span>
                                <p className="text-[9px] text-muted-foreground italic truncate">Requesting review access.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select onValueChange={(val) => handleApproveRequest(req, parseInt(val))}>
                                <SelectTrigger className="flex-1 bg-muted/30 border-none rounded-xl h-10 text-[9px] font-black uppercase tracking-widest">
                                  <SelectValue placeholder="APPROVE" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-xs font-bold">{d.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDenyRequest(req)}><X className="h-4 w-4" /></Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center gap-4">
                        <Shield className="h-12 w-12" />
                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Pending Identity Keys</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </ScrollArea>
          </div>
        </Tabs>

        {/* Unified Footer */}
        <DialogFooter className="px-8 py-6 bg-muted/10 border-t shrink-0 flex flex-row items-center justify-between gap-4">
          <CreatorFooter className="hidden sm:flex opacity-60" />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" className="rounded-xl font-bold h-11 text-xs px-6" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button 
              onClick={handleUpdateProfile} 
              className="flex-1 sm:flex-none rounded-xl font-black h-11 text-xs px-8 shadow-lg shadow-primary/20 uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 text-white" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Commit Sync
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
