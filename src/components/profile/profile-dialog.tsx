
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Camera, ShieldAlert, Eye, EyeOff, Users, Palette, Check, Upload, Link, Monitor, Tablet, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

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
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  
  const [allowGroupInvites, setAllowGroupInvites] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [interfaceMode, setInterfaceMode] = useState("laptop");

  useEffect(() => {
    if (userData && open) {
      setUsername(userData.displayName || userData.username || "");
      setPhotoURL(userData.photoURL || "");
      setBio(userData.bio || "");
      setAllowGroupInvites(userData.allowGroupInvites !== false);
      setShowOnlineStatus(userData.showOnlineStatus !== false);
      setInterfaceMode(userData.interfaceMode || "laptop");
    }
  }, [userData, open]);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // REDUCED LIMIT: 200KB to prevent "long path" errors and ensure WhatsApp-fast performance
    if (file.size > 200 * 1024) { 
      toast({ variant: "destructive", title: "Image too large", description: "Limit: 200KB. Please use a URL for high-res images." });
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
    toast({ title: "Avatar Removed", description: "Save profile to apply changes." });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      await updateProfile(user, {
        displayName: username.trim(),
        photoURL: photoURL.trim() || null
      });

      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, {
        displayName: username.trim(),
        username: userData?.username || username.toLowerCase().replace(/\s+/g, '') || null,
        photoURL: photoURL.trim() || null,
        bio: bio.trim() || null,
        interfaceMode: interfaceMode,
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Profile updated successfully" });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrivacy = async () => {
    if (!user || !db) return;
    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, {
        allowGroupInvites,
        showOnlineStatus
      });
      toast({ title: "Privacy settings updated" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match" });
      return;
    }
    setIsLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast({ title: "Password updated successfully" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Security Error",
        description: error.message || "Could not re-authenticate. Check old password."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] overflow-hidden p-0 border-none shadow-2xl bg-background">
        <DialogHeader className="p-6 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black tracking-tight uppercase">Settings Suite</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-none h-12">
            <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">User</TabsTrigger>
            <TabsTrigger value="interface" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">UI</TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">Privacy</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">Safety</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="p-6 focus-visible:ring-0 custom-scrollbar max-h-[450px] overflow-y-auto">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4 mb-4">
                <div className="relative group/avatar">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 ring-offset-2">
                    <AvatarImage src={photoURL || undefined} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-primary text-white font-black">
                      {username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity gap-2">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"
                      title="Upload Photo"
                    >
                      <Upload className="h-5 w-5 text-white" />
                    </button>
                    {photoURL && (
                      <button 
                        type="button" 
                        onClick={handleRemoveAvatar}
                        className="p-2 bg-destructive/20 hover:bg-destructive/40 rounded-full transition-colors"
                        title="Remove Avatar"
                      >
                        <Trash2 className="h-5 w-5 text-white" />
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                <div className="text-center">
                  <h4 className="font-black text-lg">@{userData?.username || username}</h4>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="displayName" className="pl-9 bg-muted/30 border-none rounded-xl font-bold h-11" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photoURL" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Avatar URL</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="photoURL" 
                    className="pl-9 bg-muted/30 border-none rounded-xl font-medium h-11 text-xs" 
                    value={photoURL} 
                    onChange={(e) => setPhotoURL(e.target.value)} 
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Bio</Label>
                <Textarea id="bio" className="bg-muted/30 border-none rounded-xl resize-none font-medium min-h-[80px]" placeholder="Tell us about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              
              <Button type="submit" className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest" disabled={isLoading || isUploading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="interface" className="p-6 focus-visible:ring-0 custom-scrollbar max-h-[450px] overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-black uppercase tracking-widest">Interface Mode</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {INTERFACE_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setInterfaceMode(mode.id)}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-2xl border-2 transition-all text-left",
                        interfaceMode === mode.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm", interfaceMode === mode.id ? "bg-primary text-white" : "bg-background text-muted-foreground")}>
                        {mode.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("text-xs font-black uppercase tracking-tight", interfaceMode === mode.id ? "text-primary" : "text-foreground")}>{mode.name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium italic">{mode.desc}</span>
                      </div>
                      {interfaceMode === mode.id && <Check className="h-4 w-4 ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Palette className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-black uppercase tracking-widest">Verse Vibe</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all relative",
                        theme === t.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("h-10 w-full rounded-lg border shadow-sm", t.color, t.border)} />
                      <span className={cn("text-[9px] font-bold uppercase tracking-tight truncate w-full text-center", theme === t.id ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleUpdateProfile} className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Settings"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="p-6 focus-visible:ring-0 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-sm font-bold">Group Invites</Label>
                    <p className="text-[10px] text-muted-foreground leading-snug">Allow others to add you to communities.</p>
                  </div>
                </div>
                <Switch checked={allowGroupInvites} onCheckedChange={setAllowGroupInvites} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    {showOnlineStatus ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-sm font-bold">Online Status</Label>
                    <p className="text-[10px] text-muted-foreground leading-snug">Let others see when you're active.</p>
                  </div>
                </div>
                <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
              </div>
            </div>

            <Button onClick={handleUpdatePrivacy} className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Privacy"}
            </Button>
          </TabsContent>

          <TabsContent value="security" className="p-6 focus-visible:ring-0">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="old" type="password" required className="pl-9 bg-muted/30 border-none rounded-xl h-11" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">New Password</Label>
                <Input id="new" type="password" required className="bg-muted/30 border-none rounded-xl h-11" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</Label>
                <Input id="confirm" type="password" required className="bg-muted/30 border-none rounded-xl h-11" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="destructive" className="w-full h-12 rounded-xl font-black shadow-lg shadow-destructive/20 mt-4 uppercase tracking-widest" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="p-4 bg-muted/30 border-t flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            <span>Duniya Settings Verified</span>
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <span>Aniruddha ❤️</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
