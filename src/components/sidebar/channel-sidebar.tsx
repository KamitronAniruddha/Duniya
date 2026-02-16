
"use client";

import { useState, useEffect } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, doc, writeBatch, arrayRemove } from "firebase/firestore";
import { Hash, Settings, ChevronDown, LogOut, Loader2, Plus, Timer, Globe, Mail, Info, Share2, Copy, Check, LogOut as LeaveIcon, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { ServerSettingsDialog } from "@/components/servers/server-settings-dialog";
import { DisappearingMessagesDialog } from "@/components/servers/disappearing-messages-dialog";
import { ContactFormDialog } from "@/components/contact/contact-form-dialog";
import { CommunityProfileDialog } from "@/components/communities/community-profile-dialog";
import { FeatureShowcaseDialog } from "@/components/features/feature-showcase-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ChannelSidebarProps {
  serverId: string | null;
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
}

export function ChannelSidebar({ serverId, activeChannelId, onSelectChannel }: ChannelSidebarProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  const [communityProfileOpen, setCommunityProfileOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [hasCopied, setHasCopied] = useState(false);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const communityRef = useMemoFirebase(() => (serverId && user ? doc(db, "communities", serverId) : null), [db, serverId, user?.uid]);
  const { data: community } = useDoc(communityRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !serverId || !user) return null;
    return query(collection(db, "communities", serverId, "channels"));
  }, [db, serverId, user?.uid]);

  const { data: channels, isLoading } = useCollection(channelsQuery);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isOwner = community?.ownerId === user?.uid;
  const isAdmin = isOwner || community?.admins?.includes(user?.uid);

  const handleLogout = async () => {
    if (user?.uid && db) {
      updateDocumentNonBlocking(doc(db, "users", user.uid), {
        onlineStatus: "offline",
        lastOnlineAt: new Date().toISOString()
      });
    }
    localStorage.setItem("justLoggedOut", "true");
    await auth.signOut();
  };

  const copyInviteLink = () => {
    if (!serverId) return;
    const link = `${window.location.origin}/invite/${serverId}`;
    navigator.clipboard.writeText(link);
    setHasCopied(true);
    toast({ title: "Invite Link Copied", description: "Share this link to invite others to the Verse." });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim() || !serverId || !db) return;
    setIsCreating(true);

    try {
      const channelRef = doc(collection(db, "communities", serverId, "channels"));
      updateDocumentNonBlocking(channelRef, {
        id: channelRef.id,
        communityId: serverId,
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        type: "text",
        createdAt: new Date().toISOString()
      });

      toast({ title: "Channel Created" });
      setNewChannelName("");
      setCreateChannelOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!serverId || !user || !db || !community) return;
    
    if (isOwner) {
      toast({ 
        variant: "destructive", 
        title: "Owner cannot leave", 
        description: "As the owner, you must dissolve the community or transfer ownership before leaving." 
      });
      return;
    }

    setIsLeaving(true);
    try {
      const batch = writeBatch(db);
      const communityDocRef = doc(db, "communities", serverId);
      const userDocRef = doc(db, "users", user.uid);
      const memberDocRef = doc(db, "communities", serverId, "members", user.uid);

      batch.update(communityDocRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid)
      });
      batch.update(userDocRef, {
        serverIds: arrayRemove(serverId)
      });
      batch.delete(memberDocRef);

      await batch.commit();
      toast({ title: "Left Community", description: `You are no longer a member of ${community.name}.` });
      window.location.href = "/";
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
      setIsLeaving(false);
    }
  };

  const lastSeen = userData?.lastOnlineAt ? new Date(userData.lastOnlineAt).getTime() : 0;
  const isFresh = (now - lastSeen) < (3 * 60 * 1000);
  const isPublic = userData?.showOnlineStatus !== false;

  const isOnline = isFresh && isPublic && userData?.onlineStatus === "online";
  const isIdle = isFresh && isPublic && userData?.onlineStatus === "idle";

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0 z-20 shadow-inner">
      {serverId && user ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <header className="h-16 px-4 border-b flex items-center gap-3 hover:bg-muted/30 transition-all cursor-pointer shrink-0 group">
                <div 
                  className="relative shrink-0"
                  onClick={(e) => { e.stopPropagation(); setCommunityProfileOpen(true); }}
                >
                  <Avatar className="h-10 w-10 border border-border shadow-sm group-hover:scale-105 transition-transform">
                    <AvatarImage src={community?.icon} />
                    <AvatarFallback className="bg-primary text-white font-black text-xs">{community?.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h2 className="font-black truncate text-lg text-foreground tracking-tighter uppercase group-hover:text-primary transition-colors">{community?.name || "..." }</h2>
                  <div className="flex items-center gap-1.5">
                    {community?.joinCode && <span className="text-[9px] text-primary font-black font-mono tracking-widest uppercase opacity-70">CODE: {community.joinCode}</span>}
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-all shrink-0">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </header>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 font-black uppercase text-[10px] tracking-widest p-1 border-none shadow-2xl bg-popover/95 backdrop-blur-md" align="start">
              <DropdownMenuItem onClick={() => setCommunityProfileOpen(true)} className="gap-2 p-3 rounded-xl hover:bg-primary/10">
                <Info className="h-4 w-4 text-primary" /> Group Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyInviteLink} className="gap-2 p-3 rounded-xl hover:bg-primary/10">
                {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4 text-primary" />}
                Invite Link
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => setServerSettingsOpen(true)} className="gap-2 p-3 rounded-xl hover:bg-primary/10">
                    <Settings className="h-4 w-4 text-primary" /> Community Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDisappearingOpen(true)} className="gap-2 p-3 rounded-xl hover:bg-orange-500/10">
                    <Timer className="h-4 w-4 text-orange-500" /> Ghost Mode (Disappearing)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                </>
              )}
              {!isOwner && (
                <DropdownMenuItem onClick={() => setLeaveConfirmOpen(true)} className="text-destructive font-black p-3 rounded-xl hover:bg-destructive/10 gap-2">
                  <LeaveIcon className="h-4 w-4" /> Leave Community
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 overflow-y-auto py-6 space-y-6 custom-scrollbar px-3">
            <div>
              <div className="px-2 mb-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">VERSE CHANNELS</span>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setCreateChannelOpen(true)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-1 relative">
                {isLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
                ) : channels?.map(c => {
                  const isActive = c.id === activeChannelId;
                  return (
                    <div key={c.id} className="group flex items-center gap-1 relative">
                      {isActive && <div className="absolute left-[-12px] w-1 h-6 bg-primary rounded-r-full animate-in slide-in-from-left duration-300" />}
                      <button 
                        onClick={() => onSelectChannel(c.id)}
                        className={cn(
                          "flex-1 flex items-center px-3 py-2.5 rounded-xl text-xs transition-all text-left uppercase font-black tracking-tight",
                          isActive ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Hash className={cn("h-4 w-4 mr-2.5 opacity-50", isActive && "opacity-100")} />
                        <span className="truncate">{c.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
          <div className="p-4 bg-muted rounded-[2rem] mb-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Select a Community</p>
        </div>
      )}

      <div className="p-4 bg-muted/20 border-t flex flex-col gap-3 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 text-[10px] font-black uppercase tracking-widest h-10 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shadow-sm"
          onClick={() => setShowcaseOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5 fill-primary" /> Explore Verse Guide
        </Button>

        <ContactFormDialog trigger={
          <Button variant="ghost" size="sm" className="w-full gap-2 text-[10px] font-black uppercase tracking-widest h-8 border-dashed border-muted-foreground/20 hover:bg-background/50">
            <Mail className="h-3 w-3" /> Contact Admin
          </Button>
        } />
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative cursor-pointer group/avatar" onClick={() => setProfileOpen(true)}>
              <Avatar className="h-10 w-10 shadow-md transition-transform group-hover/avatar:scale-105 border-2 border-transparent group-hover/avatar:border-primary/20">
                <AvatarImage src={userData?.photoURL || undefined} />
                <AvatarFallback className="bg-primary text-white font-black text-xs">{userData?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background shadow-sm transition-colors duration-200", 
                isOnline ? "bg-green-500" : isIdle ? "bg-amber-500" : "bg-muted-foreground/30"
              )} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black truncate leading-none mb-1 uppercase tracking-tight">@{userData?.username || "..."}</span>
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{isOnline ? "online" : isIdle ? "away" : "offline"}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      {serverId && <ServerSettingsDialog open={serverSettingsOpen} onOpenChange={setServerSettingsOpen} serverId={serverId} />}
      {serverId && <DisappearingMessagesDialog open={disappearingOpen} onOpenChange={setDisappearingOpen} serverId={serverId} />}
      {serverId && <CommunityProfileDialog open={communityProfileOpen} onOpenChange={setCommunityProfileOpen} serverId={serverId} />}
      <FeatureShowcaseDialog open={showcaseOpen} onOpenChange={setShowcaseOpen} />
      
      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">NEW CHANNEL</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Channel Name</Label>
              <Input placeholder="general-chat" className="bg-muted/40 border-none rounded-2xl h-12 font-bold" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setCreateChannelOpen(false)}>Cancel</Button>
            <Button className="rounded-xl font-black shadow-lg shadow-primary/20" onClick={handleCreateChannel} disabled={isCreating || !newChannelName.trim()}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="h-16 w-16 bg-destructive/10 rounded-[1.5rem] flex items-center justify-center mb-4 text-destructive mx-auto">
              <LeaveIcon className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase text-center">LEAVE COMMUNITY?</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium text-muted-foreground">
              You are about to exit <span className="text-foreground font-black">"{community?.name}"</span>. You will lose access to all channels and messages in this Verse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-2xl font-bold h-14 flex-1 border-none bg-muted/50">Stay Here</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeaveCommunity}
              disabled={isLeaving}
              className="rounded-2xl font-black h-14 flex-1 bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/20 uppercase tracking-widest"
            >
              {isLeaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Leave Verse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
