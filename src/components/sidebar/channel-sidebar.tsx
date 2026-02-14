"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Hash, Settings, ChevronDown, LogOut, Loader2, Plus, Timer, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { ServerSettingsDialog } from "@/components/servers/server-settings-dialog";
import { DisappearingMessagesDialog } from "@/components/servers/disappearing-messages-dialog";
import { ContactFormDialog } from "@/components/contact/contact-form-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const communityRef = useMemoFirebase(() => (serverId && user ? doc(db, "communities", serverId) : null), [db, serverId, user?.uid]);
  const { data: community } = useDoc(communityRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !serverId || !user) return null;
    return query(collection(db, "communities", serverId, "channels"));
  }, [db, serverId, user?.uid]);

  const { data: channels, isLoading } = useCollection(channelsQuery);

  const isOwner = community?.ownerId === user?.uid;
  const isAdmin = isOwner || community?.admins?.includes(user?.uid);

  const handleLogout = () => {
    auth.signOut();
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim() || !serverId || !db) return;
    setIsCreating(true);

    try {
      const channelRef = doc(collection(db, "communities", serverId, "channels"));
      setDocumentNonBlocking(channelRef, {
        id: channelRef.id,
        communityId: serverId,
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        type: "text",
        createdAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Channel Created" });
      setNewChannelName("");
      setCreateChannelOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0 z-20 shadow-inner">
      {serverId && user ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <header className="h-16 px-4 border-b flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer shrink-0 group">
                <div className="flex flex-col min-w-0">
                  <h2 className="font-black truncate text-sm text-foreground tracking-tight group-hover:text-primary transition-colors">{community?.name || "..." }</h2>
                  <div className="flex items-center gap-1.5">
                    {community?.joinCode && <span className="text-[9px] text-primary font-black font-mono tracking-widest uppercase opacity-70">Code: {community.joinCode}</span>}
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-all">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </header>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="start">
              {isAdmin && (
                <DropdownMenuItem onClick={() => setDisappearingOpen(true)} className="gap-2">
                  <Timer className="h-4 w-4 text-orange-500" /> Disappearing Messages
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem onClick={() => setServerSettingsOpen(true)} className="gap-2">
                  <Settings className="h-4 w-4" /> Community Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive font-bold">Leave Community</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 overflow-y-auto py-6 space-y-6 custom-scrollbar px-3">
            <div>
              <div className="px-2 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Channels</span>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreateChannelOpen(true)}>
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
                          "flex-1 flex items-center px-3 py-2 rounded-xl text-sm transition-all text-left",
                          isActive ? "bg-primary text-white font-bold shadow-lg" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Hash className="h-4 w-4 mr-2.5 opacity-50" />
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
          <div className="p-4 bg-muted rounded-full mb-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Select a Community</p>
        </div>
      )}

      <div className="p-4 bg-muted/40 border-t flex flex-col gap-4 shrink-0">
        <ContactFormDialog trigger={
          <Button variant="outline" size="sm" className="w-full gap-2 text-[10px] font-bold uppercase tracking-wider h-8 border-dashed">
            <Mail className="h-3 w-3" /> Contact Support
          </Button>
        } />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative cursor-pointer group/avatar" onClick={() => setProfileOpen(true)}>
              <Avatar className="h-10 w-10 shadow-md transition-transform group-hover/avatar:scale-105 border-2 border-transparent group-hover/avatar:border-primary/20">
                <AvatarImage src={userData?.photoURL || undefined} />
                <AvatarFallback className="bg-primary text-white font-black">{userData?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background", userData?.onlineStatus === "online" ? "bg-green-500" : "bg-muted-foreground/30")} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black truncate leading-none mb-1">@{userData?.username || "..."}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{userData?.onlineStatus || "offline"}</span>
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
      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Channel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="new-channel" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateChannelOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={isCreating || !newChannelName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}