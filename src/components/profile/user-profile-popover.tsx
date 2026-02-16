
"use client";

import { useState, useEffect, useMemo } from "react";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarDays, User as UserIcon, Maximize2, EyeOff, Ghost, Clock, Download, Heart, Reply, Camera, Lock, Key, ShieldAlert, Sparkles, Loader2, ImagePlus, Check, X, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { CreatorFooter } from "@/components/creator-footer";

interface UserProfilePopoverProps {
  userId: string;
  children: React.ReactNode;
  onWhisper?: (userId: string, username: string) => void;
  onReply?: (userId: string, username: string, photoURL: string, bio?: string, totalCommunities?: number, commonCommunities?: number) => void;
  side?: "left" | "right" | "top" | "bottom";
}

export function UserProfilePopover({ userId, children, onWhisper, onReply, side = "right" }: UserProfilePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user: currentUser } = useUser();
  
  const userRef = useMemoFirebase(() => doc(db, "users", userId), [db, userId]);
  const { data: userData } = useDoc(userRef);

  const isProfileHidden = !!userData?.isProfileHidden && userData?.id !== currentUser?.uid;

  const handleDownload = () => {
    if (!userData?.photoURL) return;
    const link = document.createElement("a");
    link.href = userData.photoURL;
    link.download = `${userData.username || 'user'}_avatar.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Avatar Saved" });
  };

  const cleanUsername = userData?.username || userData?.displayName || "User";

  if (isProfileHidden) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-64 p-6 rounded-[2rem] border-none shadow-2xl bg-popover/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 animate-pulse">
              <Ghost className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 justify-center">
                <EyeOff className="h-3 w-3" /> Identity Encrypted
              </h4>
              <p className="text-[10px] text-muted-foreground font-medium italic">This user has restricted access to their identity protocol.</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        {isOpen && (
          <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-[0_32px_64px_rgba(0,0,0,0.3)] rounded-[2rem] z-[1000] animate-in zoom-in-95 duration-200" side={side} align="start" sideOffset={10} collisionPadding={20}>
            <UserProfileContent 
              userId={userId} 
              onWhisper={(id, name) => { onWhisper?.(id, name); setIsOpen(false); }}
              onReply={(id, name, photo, bio, total, common) => { onReply?.(id, name, photo, bio, total, common); setIsOpen(false); }}
              onOpenZoom={() => setIsZoomOpen(true)}
              onOpenContribute={() => { setIsContributeOpen(true); setIsOpen(false); }}
            />
          </PopoverContent>
        )}
      </Popover>

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center z-[2000]">
          <DialogHeader className="sr-only">
            <DialogTitle>{cleanUsername} Identity Zoom</DialogTitle>
            <DialogDescription>Full-sized profile avatar view in original proportions.</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex flex-col items-center justify-center group">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }} className="relative">
              {userData?.photoURL ? <img src={userData.photoURL} alt={cleanUsername} className="max-w-full max-h-[80vh] rounded-[3rem] shadow-2xl object-contain" /> : <div className="w-64 h-64 bg-primary rounded-[3rem] flex items-center justify-center text-white text-8xl font-black shadow-2xl">{String(cleanUsername)[0]?.toUpperCase()}</div>}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-background/80 backdrop-blur-md rounded-full border border-border shadow-2xl whitespace-nowrap">
                <div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-widest text-primary">Verse Identity</span><Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" /></div>
                <div className="w-[1px] h-4 bg-border" />
                {onReply && userData && !isProfileHidden && <><button onClick={() => { onReply(userData.id, cleanUsername, userData.photoURL || "", userData.bio); setIsZoomOpen(false); }} className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors"><Camera className="h-3.5 w-3.5" /> Reply</button><div className="w-[1px] h-4 bg-border" /></>}
                {userData?.photoURL && <button onClick={handleDownload} className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors"><Download className="h-3.5 w-3.5" /> Save</button>}
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      <IdentityContributeDialog 
        open={isContributeOpen} 
        onOpenChange={setIsContributeOpen} 
        userId={userId} 
        username={cleanUsername} 
      />
    </>
  );
}

function UserProfileContent({ userId, onWhisper, onReply, onOpenZoom, onOpenContribute }: { userId: string; onWhisper?: (userId: string, username: string) => void; onReply?: (userId: string, username: string, photoURL: string, bio?: string, totalCommunities?: number, commonCommunities?: number) => void; onOpenZoom: () => void; onOpenContribute: () => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const [now, setNow] = useState(Date.now());
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  
  const userRef = useMemoFirebase(() => doc(db, "users", userId), [db, userId]);
  const { data: userData } = useDoc(userRef);

  const currentUserRef = useMemoFirebase(() => (currentUser ? doc(db, "users", currentUser.uid) : null), [db, currentUser?.uid]);
  const { data: currentUserData } = useDoc(currentUserRef);

  useEffect(() => {
    return () => {
      if (userData?.id && currentUser?.uid && userData.authorizedViewers?.includes(currentUser.uid)) {
        const ref = doc(db, "users", userData.id);
        updateDocumentNonBlocking(ref, {
          authorizedViewers: arrayRemove(currentUser.uid)
        });
      }
    };
  }, [userData?.id, currentUser?.uid, userData?.authorizedViewers, db]);

  const isBlurred = !!userData?.isProfileBlurred && 
                    userData?.id !== currentUser?.uid && 
                    !userData?.authorizedViewers?.includes(currentUser?.uid || "");

  const isHidden = !!userData?.isProfileHidden && userData?.id !== currentUser?.uid;
  const canContribute = !!userData?.allowExternalAvatarEdit && userData?.id !== currentUser?.uid;

  const hasRequested = userData?.pendingProfileRequests?.some((req: any) => req.uid === currentUser?.uid);

  const stats = useMemo(() => {
    if (!userData || !currentUserData) return { total: 0, common: 0 };
    const targetServers = userData.serverIds || [];
    const myServers = currentUserData.serverIds || [];
    const common = targetServers.filter((id: string) => myServers.includes(id)).length;
    return { total: targetServers.length, common };
  }, [userData, currentUserData]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestKey = () => {
    if (!currentUser || !db || !userData || !currentUserData) return;
    setIsRequesting(true);
    
    const request = {
      uid: currentUser.uid,
      username: currentUserData.username || currentUserData.displayName || "User",
      photoURL: currentUserData.photoURL || "",
      requestedAt: new Date().toISOString()
    };

    updateDocumentNonBlocking(userRef, {
      pendingProfileRequests: arrayUnion(request)
    });

    toast({ title: "Request Sent", description: "Identity key request dispatched to the user." });
    setTimeout(() => setIsRequesting(false), 1000);
  };

  const getJoinDate = () => {
    if (!userData?.createdAt) return "Origin Member";
    try {
      const date = new Date(userData.createdAt);
      if (isNaN(date.getTime())) return "Origin Member";
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch (e) { return "Origin Member"; }
  };

  const lastSeen = userData?.lastOnlineAt ? new Date(userData.lastOnlineAt).getTime() : 0;
  const isFresh = (now - lastSeen) < (3 * 60 * 1000);
  const isPublic = userData?.showOnlineStatus !== false;
  const isOnline = isFresh && isPublic && userData?.onlineStatus === "online";
  const isIdle = isFresh && isPublic && userData?.onlineStatus === "idle";
  const cleanUsername = userData?.username || userData?.displayName || "User";

  return (
    <div className="relative">
      <div className="h-20 bg-primary w-full relative">
        <div className="absolute top-4 right-4 flex gap-1">
          {userData?.showOnlineStatus === false && <Badge variant="secondary" className="bg-black/20 text-white border-none text-[8px] uppercase tracking-tighter"><EyeOff className="h-2.5 w-2.5 mr-1" /> Privacy Active</Badge>}
          {isBlurred && <Badge variant="secondary" className="bg-amber-500/20 text-white border-none text-[8px] uppercase tracking-tighter animate-pulse"><Lock className="h-2.5 w-2.5 mr-1" /> Blurred</Badge>}
        </div>
      </div>
      
      <div className="px-5 pb-6 bg-card">
        <div className="relative -mt-10 mb-4 flex items-end justify-between">
          <button 
            onClick={(isBlurred || isHidden) ? undefined : onOpenZoom} 
            className={cn(
              "group relative h-24 w-24 rounded-[2rem] border-4 border-card shadow-xl overflow-hidden transition-transform bg-muted shrink-0",
              (!isBlurred && !isHidden) && "hover:scale-105"
            )}
          >
            <Avatar className={cn("h-full w-full rounded-none aspect-square", (isBlurred || isHidden) && "blur-xl scale-110")}>
              <AvatarImage src={isBlurred || isHidden ? undefined : userData?.photoURL} className="object-cover aspect-square" />
              <AvatarFallback className="bg-primary text-white text-3xl font-black">{String(cleanUsername)[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {(!isBlurred && !isHidden) && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="h-6 w-6 text-white" /></div>}
          </button>
          
          <div className="flex flex-col gap-2">
            {!isHidden && (
              !isBlurred ? (
                <>
                  {onReply && userData && userData.id !== currentUser?.uid && <Button size="sm" className="rounded-xl h-8 px-4 gap-2 bg-primary text-primary-foreground font-black uppercase text-[9px] tracking-widest shadow-lg" onClick={() => onReply(userData.id, cleanUsername, userData.photoURL || "", userData.bio, stats.total, stats.common)}><Camera className="h-3 w-3" /> Reply</Button>}
                  {canContribute && <Button size="sm" className="rounded-xl h-8 px-4 gap-2 bg-accent text-accent-foreground font-black uppercase text-[9px] tracking-widest shadow-lg" onClick={onOpenContribute}><ImagePlus className="h-3 w-3" /> Gift Look</Button>}
                  {onWhisper && userData && userData.id !== currentUser?.uid && <Button size="sm" variant="outline" className="rounded-xl h-8 px-4 gap-2 text-indigo-600 font-black uppercase text-[9px] tracking-widest bg-indigo-50/50" onClick={() => onWhisper(userData.id, cleanUsername)}><Ghost className="h-3 w-3" /> Whisper</Button>}
                </>
              ) : (
                <Button 
                  size="sm" 
                  className={cn(
                    "rounded-xl h-10 px-4 gap-2 font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95",
                    hasRequested ? "bg-muted text-muted-foreground" : "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                  onClick={handleRequestKey}
                  disabled={hasRequested || isRequesting}
                >
                  {isRequesting ? <Loader2 className="h-3 w-3 animate-spin" /> : hasRequested ? <ShieldAlert className="h-3 w-3" /> : <Key className="h-3 w-3" />}
                  {hasRequested ? "Key Requested" : "Request Key"}
                </Button>
              )
            )}
          </div>
          {!isBlurred && !isHidden && (isOnline ? <div className="absolute bottom-1 left-[76px] h-6 w-6 rounded-full border-4 border-card bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" /> : isIdle ? <div className="absolute bottom-1 left-[76px] h-6 w-6 rounded-full border-4 border-card bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" /> : null)}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black tracking-tight">@{cleanUsername}</h3>
            {!isBlurred && !isHidden && (isOnline ? <Badge variant="secondary" className="bg-green-500/10 text-green-600 h-5 uppercase tracking-wider px-2">Online</Badge> : isIdle ? <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 h-5 uppercase tracking-wider px-2">Away</Badge> : null)}
          </div>
          
          <div className={cn("relative", (isBlurred || isHidden) && "blur-md select-none pointer-events-none")}>
            {userData?.bio && <p className="text-sm text-foreground/70 leading-relaxed font-medium mt-2 line-clamp-3 italic">"{userData.bio}"</p>}
          </div>
          
          {isHidden && (
            <div className="mt-2 py-3 bg-rose-500/5 rounded-xl border border-rose-500/10 flex flex-col items-center gap-2 text-center">
              <Ghost className="h-4 w-4 text-rose-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Identity Encrypted</p>
              <p className="text-[9px] text-muted-foreground px-4 leading-snug">This user has restricted access to their identity protocol. No context is shared.</p>
            </div>
          )}

          {isBlurred && !isHidden && (
            <div className="mt-2 py-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex flex-col items-center gap-2 text-center">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Identity Blurred</p>
              <p className="text-[9px] text-muted-foreground px-4 leading-snug">Request permission to reveal this member's bio and identity. Access is transient.</p>
            </div>
          )}
        </div>

        {!isBlurred && !isHidden && (
          <>
            <Separator className="my-5 opacity-50" />
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2 bg-muted rounded-xl"><CalendarDays className="h-4 w-4" /></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Joined Duniya</span>
                  <span className="text-xs font-bold text-foreground mt-0.5">{getJoinDate()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="p-2 bg-muted rounded-xl"><UserIcon className="h-4 w-4" /></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Connected Verse</span>
                  <span className="text-xs font-bold text-foreground mt-0.5">{stats.total} Communities ({stats.common} Mutual)</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="p-4 bg-muted/30 border-t flex items-center justify-center bg-card">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center">Made by Aniruddha with love ❤️</span>
      </div>
    </div>
  );
}

function IdentityContributeDialog({ open, onOpenChange, userId, username }: { open: boolean; onOpenChange: (open: boolean) => void; userId: string; username: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoURL.trim()) return;
    setIsLoading(true);

    try {
      const targetUserRef = doc(db, "users", userId);
      updateDocumentNonBlocking(targetUserRef, {
        photoURL: newPhotoURL.trim(),
        updatedAt: new Date().toISOString()
      });

      toast({ 
        title: "Identity Gift Dispatched", 
        description: `@${username} now has a new look in the Verse.` 
      });
      onOpenChange(false);
      setNewPhotoURL("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Contribution Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Limit: 200KB." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setNewPhotoURL(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background z-[2000] animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-accent/15 via-accent/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Identity contribution</span>
          </div>
          <DialogTitle className="text-3xl font-[900] tracking-tighter uppercase leading-none">Gift a Look</DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground text-xs mt-2 italic">
            "Modify how @{username} identifies in the Verse."
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="p-8 pt-2 space-y-6">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group/gift">
              <Avatar className="h-32 w-32 border-4 border-background shadow-2xl rounded-[2.5rem] ring-1 ring-accent/20 transition-transform group-hover/gift:scale-105">
                <AvatarImage src={newPhotoURL} className="object-cover" />
                <AvatarFallback className="bg-muted text-accent text-4xl font-black">
                  <UserIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-3 bg-accent rounded-2xl shadow-xl border-2 border-background text-white hover:scale-110 transition-transform active:scale-95"
              >
                <Upload className="h-5 w-5" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="w-full space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Proposed Photo URL</Label>
              <div className="relative">
                <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9 bg-muted/30 border-none rounded-xl font-medium h-11 text-xs focus:ring-2 focus:ring-accent/20" 
                  value={newPhotoURL} 
                  onChange={(e) => setNewPhotoURL(e.target.value)} 
                  placeholder="https://..." 
                />
              </div>
            </div>
          </div>

          <div className="bg-accent/5 rounded-2xl p-4 border border-accent/10">
            <div className="flex items-center gap-2 mb-1 text-accent">
              <Lock className="h-3.5 w-3.5" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Protocol Verified</h4>
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed italic">
              User has enabled Identity Contributions. This update is synchronized instantly across the Verse node.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1 rounded-xl font-bold h-12" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-xl font-black h-12 bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20 gap-2" disabled={isLoading || !newPhotoURL.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Dispatch look
            </Button>
          </DialogFooter>
        </form>

        <div className="p-6 bg-muted/20 border-t flex items-center justify-center shrink-0">
          <CreatorFooter />
        </div>
      </DialogContent>
    </Dialog>
  );
}
