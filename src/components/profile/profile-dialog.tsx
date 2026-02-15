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
import { Loader2, User, Lock, Camera, ShieldAlert, Eye, EyeOff, Users, Palette, Check, Upload } from "lucide-react";
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

  useEffect(() => {
    if (userData) {
      setUsername(userData.username || "");
      setPhotoURL(userData.photoURL || "");
      setBio(userData.bio || "");
      setAllowGroupInvites(userData.allowGroupInvites !== false);
      setShowOnlineStatus(userData.showOnlineStatus !== false);
    }
  }, [userData]);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) { // 1MB limit for profile pics
      toast({ variant: "destructive", title: "Image too large", description: "Please select an image under 1MB." });
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      // CRITICAL FIX: Only update displayName in Firebase Auth.
      // Firebase Auth photoURL has a strict length limit (approx 2048 chars).
      // Base64 image strings are much longer and must be stored in Firestore instead.
      await updateProfile(user, {
        displayName: username,
      });

      const userRef = doc(db, "users", user.uid);
      updateDocumentNonBlocking(userRef, {
        username: username.toLowerCase() || null,
        photoURL: photoURL || null,
        bio: bio || null,
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Profile updated successfully" });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
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
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] overflow-hidden p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black tracking-tight">Settings Suite</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-none h-12">
            <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">Profile</TabsTrigger>
            <TabsTrigger value="themes" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">Themes</TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">Privacy</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-none font-bold text-[10px] uppercase tracking-widest">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="p-6 focus-visible:ring-0 custom-scrollbar max-h-[450px] overflow-y-auto">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4 mb-4">
                <div className="relative group/avatar">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 ring-offset-2">
                    <AvatarImage src={photoURL || undefined} />
                    <AvatarFallback className="text-3xl bg-primary text-white font-black">
                      {username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Upload className="h-6 w-6 text-white" />
                  </button>
                </div>
                <div className="text-center">
                  <h4 className="font-black text-lg">@{username}</h4>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="username" className="pl-9 bg-muted/30 border-none rounded-xl" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Avatar Source</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Camera className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="photo" 
                      className="pl-9 bg-muted/30 border-none rounded-xl" 
                      placeholder="Paste Image URL..." 
                      value={photoURL} 
                      onChange={(e) => setPhotoURL(e.target.value)} 
                    />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl h-10 w-10 p-0 border-dashed hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground italic px-1">Paste a link or upload from your device (Max 1MB).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bio</Label>
                <Textarea id="bio" className="bg-muted/30 border-none rounded-xl resize-none" placeholder="Tell us about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20" disabled={isLoading || isUploading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="themes" className="p-6 focus-visible:ring-0 custom-scrollbar max-h-[450px] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest">Select Verse Vibe</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group relative",
                      theme === t.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("h-12 w-full rounded-xl border shadow-sm", t.color, t.border)} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", theme === t.id ? "text-primary" : "text-muted-foreground")}>{t.name}</span>
                    {theme === t.id && (
                      <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
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

            <Separator className="opacity-50" />

            <div className="bg-primary/5 p-4 rounded-2xl flex items-start gap-3 border border-primary/10">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Note: Changing your online status visibility will apply immediately. If hidden, you will appear offline to all users in the Verse.
              </p>
            </div>

            <Button onClick={handleUpdatePrivacy} className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Privacy"}
            </Button>
          </TabsContent>

          <TabsContent value="security" className="p-6 focus-visible:ring-0">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="old" type="password" required className="pl-9 bg-muted/30 border-none rounded-xl" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">New Password</Label>
                <Input id="new" type="password" required className="bg-muted/30 border-none rounded-xl" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
                <Input id="confirm" type="password" required className="bg-muted/30 border-none rounded-xl" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button type="submit" variant="destructive" className="w-full h-12 rounded-xl font-black shadow-lg shadow-destructive/20 mt-4" disabled={isLoading}>
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
