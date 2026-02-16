
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, arrayRemove, arrayUnion } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Camera, ShieldAlert, Eye, EyeOff, Users, Palette, Check, Upload, Link, Monitor, Tablet, Smartphone, Sparkles, Trash2, Download, Heart, Maximize2, Shield, UserCheck, X } from "lucide-react";
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

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEMES = [
  { id: "light", name: "Duniya Classic", color: "bg-white", border: "border-slate-200" },
  { id: "dark", name: "Deep Dark", color: "bg-slate-900", border: "border-slate-800" },
  { id: "midnight", name: "Midnight Purple", color: "bg-indigo-950", border: "border-indigo-900" },
  { id: "cyberpunk", name: "Neon Cyber", color: "bg-black", border: "border-pink-500" },
  { id: "rosegold", name: "Rose Gold", color: "bg-rose-50", border: "border-rose-200" },
  { id: "forest", name: "Forest Green", color: "bg-emerald-950", border: "border-emerald-900" },
  { id: "ocean", name: "Ocean Breeze", color: "bg-sky-50", border: "border-sky-200" },
  { id: "crimson", name: "Crimson Fury", color: "bg-red-950", border: "border-red-900" },
  { id: "amber", name: "Amber Sunset", color: "bg-amber-950", border: "border-amber-900" },
];

const INTERFACE_MODES = [
  { id: "laptop", name: "Laptop", icon: <Monitor className="h-4 w-4" />, desc: "Triple column power user layout." },
  { id: "tablet", name: "Tablet", icon: <Tablet className="h-4 w-4" />, desc: "Streamlined dual-pane dashboard." },
  { id: "mobile", name: "Mobile", icon: <Smartphone className="h-4 w-4" />, desc: "Thumb-friendly social immersive view." },
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
  const [isUploading, setIsUploading] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  
  const [allowGroupInvites, setAllowGroupInvites] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [interfaceMode, setInterfaceMode] = useState("laptop");
  const [isProfileHidden, setIsProfileHidden] = useState(false);
  const [isProfileBlurred, setIsProfileBlurred] = useState(false);

  useEffect(() => {
    if (userData && open) {
      setUsername(userData.displayName || userData.username || "");
      setPhotoURL(userData.photoURL || "");
      setBio(userData.bio || "");
      setAllowGroupInvites(userData.allowGroupInvites !== false);
      setShowOnlineStatus(userData.showOnlineStatus !== false);
      setInterfaceMode(userData.interfaceMode || "laptop");
      setIsProfileHidden(!!userData.isProfileHidden);
      setIsProfileBlurred(!!userData.isProfileBlurred);
    }
  }, [userData, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 200 * 1024) { 
      toast({ variant: "destructive", title: "Image too large", description: "Limit: 200KB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoURL(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setPhotoURL("");
    toast({ title: "Avatar Removed" });
  };

  const handleDownloadAvatar = () => {
    if (!photoURL) return;
    const link = document.createElement("a");
    link.href = photoURL;
    link.download = `${username.replace(/\s+/g, '_')}_avatar.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Avatar Saved" });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      await updateProfile(user, {
        displayName: username.trim()
      });

      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, {
        displayName: username.trim(),
        username: userData?.username || username.toLowerCase().replace(/\s+/g, '') || null,
        photoURL: photoURL.trim() || null,
        bio: bio.trim() || null,
        interfaceMode: interfaceMode,
        isProfileHidden,
        isProfileBlurred,
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Profile updated successfully" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = (requestingUser: any) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.uid);
    updateDocumentNonBlocking(userRef, {
      authorizedViewers: arrayUnion(requestingUser.uid),
      pendingProfileRequests: arrayRemove(requestingUser)
    });
    toast({ title: "Key Granted", description: `@${requestingUser.username} can now see your identity.` });
  };

  const handleDenyRequest = (requestingUser: any) => {
    if (!user || !db) return;
    const userRef = doc(db, "users", user.uid);
    updateDocumentNonBlocking(userRef, {
      pendingProfileRequests: arrayRemove(requestingUser)
    });
    toast({ title: "Request Denied" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] overflow-hidden p-0 border-none shadow-2xl bg-background">
          <DialogHeader className="p-6 bg-gradient-to-b from-primary/10 to-transparent">
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Settings Suite</DialogTitle>
            <DialogDescription className="sr-only">Update your profile, interface preferences, and privacy settings.</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-none h-12">
              <TabsTrigger value="profile" className="data-[state=active]:bg-background font-bold text-[10px] uppercase tracking-widest text-[8px] sm:text-[10px]">User</TabsTrigger>
              <TabsTrigger value="interface" className="data-[state=active]:bg-background font-bold text-[10px] uppercase tracking-widest text-[8px] sm:text-[10px]">UI</TabsTrigger>
              <TabsTrigger value="privacy" className="data-[state=active]:bg-background font-bold text-[10px] uppercase tracking-widest text-[8px] sm:text-[10px]">Privacy</TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-background font-bold text-[10px] uppercase tracking-widest text-[8px] sm:text-[10px] relative">
                Keys
                {userData?.pendingProfileRequests?.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="focus-visible:ring-0 custom-scrollbar max-h-[450px] overflow-y-auto">
              <TabsContent value="profile" className="p-6 m-0">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex flex-col items-center justify-center gap-4 mb-4">
                    <div className="relative group/avatar">
                      <button type="button" onClick={() => setIsZoomOpen(true)} className="block">
                        <Avatar className="h-24 w-24 ring-4 ring-primary/10 ring-offset-2 transition-transform hover:scale-105 active:scale-95">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="text-3xl bg-primary text-white font-black">
                            {username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"><Upload className="h-4 w-4 text-white" /></button>
                        {photoURL && <button type="button" onClick={handleRemoveAvatar} className="p-2 bg-destructive/20 hover:bg-destructive/40 rounded-full transition-colors"><Trash2 className="h-4 w-4 text-white" /></button>}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="text-center">
                      <h4 className="font-black text-lg">@{userData?.username || username}</h4>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Display Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9 bg-muted/30 border-none rounded-xl font-bold h-11" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Avatar URL</Label>
                    <div className="relative">
                      <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9 bg-muted/30 border-none rounded-xl font-medium h-11 text-xs" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Bio</Label>
                    <Textarea className="bg-muted/30 border-none rounded-xl resize-none font-medium min-h-[80px]" placeholder="Tell us about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>
                  
                  <Button type="submit" className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest" disabled={isLoading || isUploading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="interface" className="p-6 m-0">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-primary" /><h4 className="text-xs font-black uppercase tracking-widest">Interface Mode</h4></div>
                    <div className="grid grid-cols-1 gap-2">
                      {INTERFACE_MODES.map((mode) => (
                        <button key={mode.id} onClick={() => setInterfaceMode(mode.id)} className={cn("flex items-center gap-4 p-3 rounded-2xl border-2 transition-all text-left", interfaceMode === mode.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm", interfaceMode === mode.id ? "bg-primary text-white" : "bg-background text-muted-foreground")}>{mode.icon}</div>
                          <div className="flex flex-col"><span className={cn("text-xs font-black uppercase tracking-tight", interfaceMode === mode.id ? "text-primary" : "text-foreground")}>{mode.name}</span><span className="text-[10px] text-muted-foreground font-medium italic">{mode.desc}</span></div>
                          {interfaceMode === mode.id && <Check className="h-4 w-4 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1"><Palette className="h-4 w-4 text-primary" /><h4 className="text-xs font-black uppercase tracking-widest">Verse Vibe</h4></div>
                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map((t) => (
                        <button key={t.id} onClick={() => setTheme(t.id)} className={cn("flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all relative", theme === t.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                          <div className={cn("h-10 w-full rounded-lg border shadow-sm", t.color, t.border)} /><span className={cn("text-[9px] font-bold uppercase tracking-tight truncate w-full text-center", theme === t.id ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleUpdateProfile} className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Settings"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="p-6 m-0 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/50">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-rose-500" />
                        <Label className="text-sm font-black uppercase tracking-tight">Identity Hide</Label>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Others cannot open your profile.</p>
                    </div>
                    <Switch checked={isProfileHidden} onCheckedChange={setIsProfileHidden} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/50">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-600" />
                        <Label className="text-sm font-black uppercase tracking-tight">Blur Protocol</Label>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Request permission to view profile.</p>
                    </div>
                    <Switch checked={isProfileBlurred} onCheckedChange={setIsProfileBlurred} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/50">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-black uppercase tracking-tight">Status Broadcast</Label>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Show when you are on-screen.</p>
                    </div>
                    <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                  </div>
                </div>
                <Button onClick={handleUpdateProfile} className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest" disabled={isLoading}>
                  Save Privacy
                </Button>
              </TabsContent>

              <TabsContent value="requests" className="p-0 m-0 h-[400px]">
                <ScrollArea className="h-full">
                  {userData?.pendingProfileRequests?.length > 0 ? (
                    <div className="p-6 space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Pending Key Requests</h4>
                      {userData.pendingProfileRequests.map((req: any) => (
                        <div key={req.uid} className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl border border-border/50">
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={req.photoURL} />
                            <AvatarFallback className="bg-primary text-white font-black">{req.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-black uppercase tracking-tight">@{req.username}</span>
                            <p className="text-[9px] text-muted-foreground font-medium truncate italic">Wants access to your identity.</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => handleDenyRequest(req)}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => handleApproveRequest(req)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                      <Shield className="h-12 w-12" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Active Requests</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>

          <div className="p-4 bg-muted/30 border-t flex items-center justify-center">
            <CreatorFooter />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center z-[2000]">
          <DialogHeader className="sr-only">
            <DialogTitle>Your Identity Zoom</DialogTitle>
            <DialogDescription>Full-sized preview of your profile avatar.</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }} className="relative group">
              {photoURL ? <img src={photoURL} className="max-w-full max-h-[80vh] rounded-[3rem] shadow-2xl object-contain" alt="Zoomed view" /> : <div className="w-64 h-64 bg-primary rounded-[3rem] flex items-center justify-center text-white text-8xl font-black shadow-2xl">{username?.[0]?.toUpperCase() || "?"}</div>}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-background/80 backdrop-blur-md rounded-full border border-border shadow-2xl">
                <div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-widest text-primary">Your Identity</span><Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" /></div>
                {photoURL && <><div className="w-[1px] h-4 bg-border" /><button onClick={handleDownloadAvatar} className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors"><Download className="h-3.5 w-3.5" /> Save</button></>}
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
