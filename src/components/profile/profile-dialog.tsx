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
import { Loader2, User, Lock, Camera, ShieldAlert, Eye, EyeOff, Users, Palette, Check, Upload, Link, Monitor, Tablet, Smartphone, Sparkles, Trash2, Download, Heart, Maximize2, Shield, UserCheck, X, Key, ImagePlus, Clock, Zap, Activity } from "lucide-react";
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
  { label: "Session Only", value: 0 },
];

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
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
  
  const [isGlobalAccessActive, setIsGlobalAccessActive] = useState(false);
  const [globalDuration, setGlobalDuration] = useState("3600000");

  useEffect(() => {
    if (userData && open) {
      setUsername(userData.displayName || userData.username || "");
      setPhotoURL(userData.photoURL || "");
      setBio(userData.bio || "");
      setIsProfileHidden(!!userData.isProfileHidden);
      setIsProfileBlurred(!!userData.isProfileBlurred);
      setInterfaceMode(userData.interfaceMode || "laptop");
      setAllowExternalAvatarEdit(!!userData.allowExternalAvatarEdit);
      
      const now = new Date();
      const expiry = userData.globalAccessExpiry ? new Date(userData.globalAccessExpiry) : null;
      setIsGlobalAccessActive(!!expiry && expiry > now);
    }
  }, [userData, open]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
        globalAccessExpiry: globalExpiry,
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Identity Suite Updated" });
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
    const expiresAt = durationMs === 0 
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // Session key (approx 30m)
      : new Date(Date.now() + durationMs).toISOString();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] overflow-hidden p-0 border-none shadow-2xl bg-background">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Identity Suite</DialogTitle>
          <DialogDescription className="sr-only">Profile and privacy controls.</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-none h-12">
            <TabsTrigger value="profile" className="font-black text-[10px] uppercase tracking-widest">User</TabsTrigger>
            <TabsTrigger value="interface" className="font-black text-[10px] uppercase tracking-widest">Vibe</TabsTrigger>
            <TabsTrigger value="privacy" className="font-black text-[10px] uppercase tracking-widest">Shield</TabsTrigger>
            <TabsTrigger value="keys" className="font-black text-[10px] uppercase tracking-widest relative">
              Keys
              {userData?.pendingProfileRequests?.length > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />}
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[450px]">
            <TabsContent value="profile" className="p-8 m-0 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group/avatar">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 ring-offset-4">
                    <AvatarImage src={photoURL || undefined} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-primary text-white font-black">{username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all"><Camera className="h-6 w-6 text-white" /></button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPhotoURL(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                <div className="text-center">
                  <h4 className="font-black text-lg">@{userData?.username || username}</h4>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Display Name</Label>
                  <Input className="bg-muted/30 border-none rounded-2xl h-12 font-bold" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Bio Snapshot</Label>
                  <Textarea className="bg-muted/30 border-none rounded-2xl font-medium min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleUpdateProfile} className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 uppercase tracking-widest" disabled={isLoading}>Save Identity</Button>
            </TabsContent>

            <TabsContent value="interface" className="p-8 m-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h4 className="text-xs font-black uppercase tracking-widest">Interface Logic</h4></div>
                {['laptop', 'tablet', 'mobile'].map((m) => (
                  <button key={m} onClick={() => setInterfaceMode(m)} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left", interfaceMode === m ? "border-primary bg-primary/5" : "border-transparent bg-muted/30")}>
                    <Monitor className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-tight flex-1">{m}</span>
                    {interfaceMode === m && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
              <Button onClick={handleUpdateProfile} className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 uppercase tracking-widest">Apply Interface</Button>
            </TabsContent>

            <TabsContent value="privacy" className="p-8 m-0 space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between border border-border/50">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-black uppercase">Identity Encryption</Label>
                    <p className="text-[10px] text-muted-foreground italic">Hide your entire profile presence.</p>
                  </div>
                  <Switch checked={isProfileHidden} onCheckedChange={setIsProfileHidden} />
                </div>
                <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between border border-border/50">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-black uppercase">Blur Protocol</Label>
                    <p className="text-[10px] text-muted-foreground italic">Require transient keys to view profile.</p>
                  </div>
                  <Switch checked={isProfileBlurred} onCheckedChange={setIsProfileBlurred} />
                </div>
                <Separator className="opacity-50" />
                <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm font-black uppercase text-primary">Identity Broadcast</Label>
                      <p className="text-[10px] text-muted-foreground italic">Open review access to ALL users.</p>
                    </div>
                    <Switch checked={isGlobalAccessActive} onCheckedChange={setIsGlobalAccessActive} />
                  </div>
                  {isGlobalAccessActive && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Broadcast Duration</Label>
                      <Select value={globalDuration} onValueChange={setGlobalDuration}>
                        <SelectTrigger className="bg-background border-none rounded-xl h-10 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-xs font-bold">{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleUpdateProfile} className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 uppercase tracking-widest">Update Shield</Button>
            </TabsContent>

            <TabsContent value="keys" className="p-8 m-0 space-y-6">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center gap-3">
                <Key className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">Protocol Verified</span>
                  <p className="text-[9px] text-muted-foreground italic mt-1">Review keys are time-distance controlled.</p>
                </div>
              </div>

              {userData?.pendingProfileRequests?.length > 0 ? (
                <div className="space-y-3">
                  {userData.pendingProfileRequests.map((req: any) => (
                    <div key={req.uid} className="p-4 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={req.photoURL} /><AvatarFallback className="bg-primary text-white font-black">{req.username?.[0]}</AvatarFallback></Avatar>
                        <div className="flex-1"><span className="text-xs font-black uppercase tracking-tight">@{req.username}</span><p className="text-[9px] text-muted-foreground italic line-clamp-1">Wants identity review access.</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(val) => handleApproveRequest(req, parseInt(val))}>
                          <SelectTrigger className="flex-1 bg-background border-none rounded-xl h-10 text-[10px] font-black uppercase tracking-widest">
                            <SelectValue placeholder="GRANT ACCESS" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-2xl">
                            {DURATIONS.map(d => <SelectItem key={d.value} value={d.value.toString()} className="text-xs font-bold">Approve for {d.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDenyRequest(req)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-4">
                  <Shield className="h-12 w-12" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Active Requests</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-4 bg-muted/30 border-t flex items-center justify-center"><CreatorFooter /></div>
      </DialogContent>
    </Dialog>
  );
}
