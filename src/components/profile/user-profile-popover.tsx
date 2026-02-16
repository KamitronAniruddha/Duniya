
"use client";

import { useState, useEffect, useMemo } from "react";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarDays, User as UserIcon, Maximize2, EyeOff, Ghost, Clock, Download, Heart, Reply, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const db = useFirestore();
  
  const userRef = useMemoFirebase(() => doc(db, "users", userId), [db, userId]);
  const { data: userData } = useDoc(userRef);

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
                {onReply && userData && <><button onClick={() => { onReply(userData.id, cleanUsername, userData.photoURL || "", userData.bio); setIsZoomOpen(false); }} className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors"><Camera className="h-3.5 w-3.5" /> Reply</button><div className="w-[1px] h-4 bg-border" /></>}
                {userData?.photoURL && <button onClick={handleDownload} className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors"><Download className="h-3.5 w-3.5" /> Save</button>}
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserProfileContent({ userId, onWhisper, onReply, onOpenZoom }: { userId: string; onWhisper?: (userId: string, username: string) => void; onReply?: (userId: string, username: string, photoURL: string, bio?: string, totalCommunities?: number, commonCommunities?: number) => void; onOpenZoom: () => void }) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const [now, setNow] = useState(Date.now());
  
  const userRef = useMemoFirebase(() => doc(db, "users", userId), [db, userId]);
  const { data: userData } = useDoc(userRef);

  const currentUserRef = useMemoFirebase(() => (currentUser ? doc(db, "users", currentUser.uid) : null), [db, currentUser?.uid]);
  const { data: currentUserData } = useDoc(currentUserRef);

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
    <>
      <div className="h-20 bg-primary w-full relative">
        <div className="absolute top-4 right-4 flex gap-1">{userData?.showOnlineStatus === false && <Badge variant="secondary" className="bg-black/20 text-white border-none text-[8px] uppercase tracking-tighter"><EyeOff className="h-2.5 w-2.5 mr-1" /> Privacy Active</Badge>}</div>
      </div>
      <div className="px-5 pb-6 bg-card">
        <div className="relative -mt-10 mb-4 flex items-end justify-between">
          <button onClick={onOpenZoom} className="group relative h-24 w-24 rounded-[2rem] border-4 border-card shadow-xl overflow-hidden transition-transform hover:scale-105 bg-muted shrink-0">
            <Avatar className="h-full w-full rounded-none aspect-square"><AvatarImage src={userData?.photoURL || undefined} className="object-cover aspect-square" /><AvatarFallback className="bg-primary text-white text-3xl font-black">{String(cleanUsername)[0]?.toUpperCase()}</AvatarFallback></Avatar>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="h-6 w-6 text-white" /></div>
          </button>
          <div className="flex flex-col gap-2">
            {onReply && userData && userData.id !== currentUser?.uid && <Button size="sm" className="rounded-xl h-8 px-4 gap-2 bg-primary text-primary-foreground font-black uppercase text-[9px] tracking-widest shadow-lg" onClick={() => onReply(userData.id, cleanUsername, userData.photoURL || "", userData.bio, stats.total, stats.common)}><Camera className="h-3 w-3" /> Reply</Button>}
            {onWhisper && userData && userData.id !== currentUser?.uid && <Button size="sm" variant="outline" className="rounded-xl h-8 px-4 gap-2 text-indigo-600 font-black uppercase text-[9px] tracking-widest bg-indigo-50/50" onClick={() => onWhisper(userData.id, cleanUsername)}><Ghost className="h-3 w-3" /> Whisper</Button>}
          </div>
          {isOnline ? <div className="absolute bottom-1 left-[76px] h-6 w-6 rounded-full border-4 border-card bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" /> : isIdle ? <div className="absolute bottom-1 left-[76px] h-6 w-6 rounded-full border-4 border-card bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" /> : null}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2"><h3 className="text-xl font-black tracking-tight">@{cleanUsername}</h3>{isOnline ? <Badge variant="secondary" className="bg-green-500/10 text-green-600 h-5 uppercase tracking-wider px-2">Online</Badge> : isIdle ? <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 h-5 uppercase tracking-wider px-2">Away</Badge> : null}</div>
          {userData?.bio && <p className="text-sm text-foreground/70 leading-relaxed font-medium mt-2 line-clamp-3 italic">"{userData.bio}"</p>}
        </div>
        <Separator className="my-5 opacity-50" />
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground"><div className="p-2 bg-muted rounded-xl"><CalendarDays className="h-4 w-4" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest leading-none">Joined Duniya</span><span className="text-xs font-bold text-foreground mt-0.5">{getJoinDate()}</span></div></div>
          <div className="flex items-center gap-3 text-muted-foreground"><div className="p-2 bg-muted rounded-xl"><UserIcon className="h-4 w-4" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest leading-none">Connected Verse</span><span className="text-xs font-bold text-foreground mt-0.5">{stats.total} Communities ({stats.common} Mutual)</span></div></div>
        </div>
      </div>
      <div className="p-4 bg-muted/30 border-t flex items-center justify-center bg-card">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center">Made by Aniruddha with love ❤️</span>
      </div>
    </>
  );
}
