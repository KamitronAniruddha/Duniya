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
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CreatorFooter } from "@/components/creator-footer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { id: 'laptop', label: 'Laptop', icon: <Monitor className="h-5 w-5" />, desc: 'Full-depth desktop interaction.' },
  { id: 'tablet', label: 'Tablet', icon: <Tablet className="h-5 w-5" />, desc: 'Hybrid focus with sidebar nav.' },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-5 w-5" />, desc: 'Compact single-column view.' },
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

      toast({ title: "Identity Suite Updated", description: "Changes synchronized across the Verse." });
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
      <DialogContent className="sm:max-w-[500px] rounded-[3rem] overflow-hidden p-0 border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] bg-background h-[90vh] max-h-[800px] flex flex-col">
        <DialogHeader className="p-10 pb-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent shrink-0 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <Fingerprint className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/80">Identity Suite v3.0</span>
            </div>
            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Secure Node</span>
            </div>
          </div>
          <DialogTitle className="text-4xl font-[900] tracking-tighter uppercase leading-tight text-foreground relative z-10">
            Manage <span className="text-primary italic">Persona</span>
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground/80 text-sm mt-2 italic relative z-10">
            "Your digital signature and privacy protocols in the Duniya Verse."
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-none h-14 border-b border-border/50 shrink-0">
            <TabsTrigger value="profile" className="font-black text-[10px] uppercase tracking-widest h-full data-[state=active]:bg-background data-[state=active]:shadow-none transition-all">Identity</TabsTrigger>
            <TabsTrigger value="interface" className="font-black text-[10px] uppercase tracking-widest h-full data-[state=active]:bg-background data-[state=active]:shadow-none transition-all">Interface</TabsTrigger>
            <TabsTrigger value="privacy" className="font-black text-[10px] uppercase tracking-widest h-full data-[state=active]:bg-background data-[state=active]:shadow-none transition-all">Shield</TabsTrigger>
            <TabsTrigger value="keys" className="font-black text-[10px] uppercase tracking-widest h-full data-[state=active]:bg-background data-[state=active]:shadow-none transition-all relative">
              Access
              {userData?.pendingProfileRequests?.length > 0 && <span className="absolute top-3 right-3 h-2 w-2 bg-rose-500 rounded-full animate-ping" />}
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <TabsContent key="tab-profile" value="profile" className="p-10 m-0 space-y-10">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
                    <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
                      <div className="relative group/avatar">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-125 opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                        <Avatar className="h-32 w-32 ring-8 ring-background shadow-2xl transition-all group-hover/avatar:scale-105 relative z-10">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="text-5xl bg-primary text-white font-[900]">{username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="absolute -bottom-2 -right-2 p-3 bg-primary rounded-2xl shadow-xl border-4 border-background text-white z-20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Camera className="h-6 w-6" />
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
                      <div className="text-center space-y-1">
                        <h4 className="font-black text-2xl tracking-tight">@{userData?.username || username}</h4>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">{user?.email}</p>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Display Identity</Label>
                        <Input 
                          className="bg-muted/30 border-none rounded-[1.25rem] h-14 font-bold text-base px-6 focus:ring-2 focus:ring-primary/20 transition-all" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder="e.g. John Doe"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Identity URL (Optional)</Label>
                        <div className="relative">
                          <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="bg-muted/30 border-none rounded-[1.25rem] h-14 font-medium text-sm pl-12 pr-6 focus:ring-2 focus:ring-primary/20 transition-all" 
                            value={photoURL} 
                            onChange={(e) => setPhotoURL(e.target.value)} 
                            placeholder="https://images.com/my-photo.jpg"
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground italic px-2">Set avatar via direct link or local upload.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Social Bio Snapshot</Label>
                        <Textarea 
                          className="bg-muted/30 border-none rounded-[1.5rem] font-medium min-h-[120px] px-6 py-4 focus:ring-2 focus:ring-primary/20 transition-all resize-none" 
                          value={bio} 
                          onChange={(e) => setBio(e.target.value)} 
                          placeholder="Tell the Verse about yourself..."
                        />
                      </div>
                    </motion.div>
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === "interface" && (
                <TabsContent key="tab-interface" value="interface" className="p-10 m-0 space-y-10">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
                    <motion.div variants={itemVariants} className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-black uppercase tracking-widest">Interface Topology</h4>
                    </motion.div>

                    <div className="space-y-4">
                      {INTERFACE_MODES.map((m) => (
                        <motion.button 
                          key={m.id}
                          variants={itemVariants}
                          onClick={() => setInterfaceMode(m.id)} 
                          className={cn(
                            "w-full flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all text-left group",
                            interfaceMode === m.id ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" : "border-transparent bg-muted/20 hover:bg-muted/40"
                          )}
                        >
                          <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                            interfaceMode === m.id ? "bg-primary text-white" : "bg-background text-muted-foreground"
                          )}>
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-black uppercase tracking-tight block">{m.label}</span>
                            <span className="text-[10px] text-muted-foreground font-medium italic">{m.desc}</span>
                          </div>
                          {interfaceMode === m.id && <Check className="h-5 w-5 text-primary animate-in zoom-in" />}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === "privacy" && (
                <TabsContent key="tab-privacy" value="privacy" className="p-10 m-0 space-y-10">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <motion.div variants={itemVariants} className="p-6 bg-muted/20 rounded-[2.5rem] border border-border/50 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-rose-500" /> Identity Encryption
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic">Activate @phide protocol to vanish from the Verse.</p>
                        </div>
                        <Switch checked={isProfileHidden} onCheckedChange={setIsProfileHidden} />
                      </div>
                      
                      <Separator className="opacity-30" />

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <EyeOff className="h-3.5 w-3.5 text-amber-500" /> Blur Protocol
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic">Force transient keys via @porn protocol.</p>
                        </div>
                        <Switch checked={isProfileBlurred} onCheckedChange={setIsProfileBlurred} />
                      </div>

                      <Separator className="opacity-30" />

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <ImagePlus className="h-3.5 w-3.5 text-emerald-500" /> Collaborative Look
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic">Allow others to suggest identity updates.</p>
                        </div>
                        <Switch checked={allowExternalAvatarEdit} onCheckedChange={setAllowExternalAvatarEdit} />
                      </div>

                      <Separator className="opacity-30" />

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-primary" /> Live Presence
                          </Label>
                          <p className="text-[10px] text-muted-foreground italic">Broadcast your real-time 'On Screen' status.</p>
                        </div>
                        <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 space-y-6 relative overflow-hidden">
                      <div className="absolute -top-4 -right-4 p-8 opacity-[0.03]"><Globe className="h-20 w-20 text-primary" /></div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1 relative z-10">
                          <Label className="text-sm font-black uppercase text-primary tracking-tight">Identity Broadcast</Label>
                          <p className="text-[10px] text-muted-foreground italic">Unmask identity for ALL users temporarily.</p>
                        </div>
                        <Switch checked={isGlobalAccessActive} onCheckedChange={setIsGlobalAccessActive} />
                      </div>
                      {isGlobalAccessActive && (
                        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 relative z-10">
                          <Label className="text-[9px] font-black uppercase text-primary tracking-widest ml-1">Broadcast Duration</Label>
                          <Select value={globalDuration} onValueChange={setGlobalDuration}>
                            <SelectTrigger className="bg-background/80 backdrop-blur-md border-none rounded-2xl h-12 text-xs font-bold shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-xs font-bold">Open for {d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === "keys" && (
                <TabsContent key="tab-keys" value="keys" className="p-10 m-0 space-y-10">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                    <motion.div variants={itemVariants} className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="h-12 w-12 text-primary" /></div>
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Key className="h-6 w-6" /></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-widest text-primary leading-none">Security Suite</span>
                        <p className="text-[10px] text-muted-foreground italic mt-1">Manage transient identity review keys.</p>
                      </div>
                    </motion.div>

                    {userData?.pendingProfileRequests?.length > 0 ? (
                      <div className="space-y-4">
                        {userData.pendingProfileRequests.map((req: any) => (
                          <motion.div key={req.uid} variants={itemVariants} className="p-5 bg-muted/20 rounded-[2rem] border border-border/50 space-y-5 group hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-background shadow-md"><AvatarImage src={req.photoURL} /><AvatarFallback className="bg-primary text-white font-[900] uppercase">{req.username?.[0]}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-[900] uppercase tracking-tight block truncate">@{req.username}</span>
                                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Wants review access.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select onValueChange={(val) => handleApproveRequest(req, parseInt(val))}>
                                <SelectTrigger className="flex-1 bg-background border-none rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                                  <SelectValue placeholder="APPROVE ACCESS" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-xs font-bold">Approve for {d.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors" onClick={() => handleDenyRequest(req)}><X className="h-5 w-5" /></Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-24 opacity-20 gap-6 text-center">
                        <div className="p-10 bg-muted/50 rounded-[3rem]"><Shield className="h-20 w-20" /></div>
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Vault Secured — No Pending Requests</p>
                      </motion.div>
                    )}
                  </motion.div>
                </TabsContent>
              )}
            </AnimatePresence>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="p-10 pt-4 shrink-0 border-t bg-muted/10 flex flex-col gap-4">
          <Button 
            onClick={handleUpdateProfile} 
            className="w-full h-16 rounded-[1.5rem] font-[900] text-lg shadow-2xl shadow-primary/20 uppercase tracking-widest gap-3 relative overflow-hidden group" 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <ShieldCheck className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                Commit Identity
              </>
            )}
          </Button>
          <div className="flex items-center justify-center pt-2">
            <CreatorFooter />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
