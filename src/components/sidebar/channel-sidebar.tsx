"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, where, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Hash, Settings, ChevronDown, LogOut, Loader2, Plus, Edit2, Copy, Share2, Timer, Heart, Link as LinkIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { ServerSettingsDialog } from "@/components/servers/server-settings-dialog";
import { ChannelSettingsDialog } from "@/components/channels/channel-settings-dialog";
import { DisappearingMessagesDialog } from "@/components/servers/disappearing-messages-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  const [editChannelId, setEditChannelId] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const serverRef = useMemoFirebase(() => (serverId && user ? doc(db, "servers", serverId) : null), [db, serverId, user?.uid]);
  const { data: server } = useDoc(serverRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !serverId || !user) return null;
    return query(collection(db, "channels"), where("serverId", "==", serverId));
  }, [db, serverId, user?.uid]);

  const { data: channels, isLoading } = useCollection(channelsQuery);

  const isOwner = server?.ownerId === user?.uid;
  const isAdmin = isOwner || server?.admins?.includes(user?.uid);

  const handleLogout = () => {
    if (user && db && auth.currentUser) {
      const userRef = doc(db, "users", user.uid);
      updateDoc(userRef, {
        onlineStatus: "offline",
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
    auth.signOut();
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim() || !serverId || !db) return;
    setIsCreating(true);

    try {
      const channelRef = doc(collection(db, "channels"));
      setDocumentNonBlocking(channelRef, {
        id: channelRef.id,
        serverId: serverId,
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        type: "text",
        createdAt: serverTimestamp()
      }, { merge: true });

      toast({ title: "Channel Created", description: `#${newChannelName} is ready!` });
      setNewChannelName("");
      setCreateChannelOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const shareInviteLink = () => {
    if (server?.joinCode) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteLink = `${origin}?join=${server.joinCode}`;
      navigator.clipboard.writeText(inviteLink);
      toast({ 
        title: "Invite Link Copied!", 
        description: "A direct join link for this group has been copied to your clipboard." 
      });
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0 z-20">
      {serverId && user ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <header className="h-16 px-4 border-b flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer shrink-0 group">
                <div className="flex flex-col min-w-0">
                  <h2 className="font-black truncate text-sm text-foreground tracking-tight group-hover:text-primary transition-colors">{server?.name || "..." }</h2>
                  <div className="flex items-center gap-1.5">
                    {server?.joinCode && <span className="text-[9px] text-primary font-black font-mono tracking-widest uppercase opacity-70">Code: {server.joinCode}</span>}
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-[9px] text-muted-foreground font-bold uppercase">{server?.members?.length || 0} Members</span>
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </header>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="start">
              <DropdownMenuItem onClick={shareInviteLink} className="flex items-center gap-2 font-bold text-primary">
                <LinkIcon className="h-4 w-4" />
                Share Invite Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => setDisappearingOpen(true)} className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-orange-500" />
                  Disappearing Messages
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem onClick={() => setServerSettingsOpen(true)} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Server Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                if (!serverId) return;
                navigator.clipboard.writeText(serverId);
                toast({ title: "Copied!", description: "Server ID copied to clipboard." });
              }} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy Server ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive font-bold">Leave Server</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 overflow-y-auto py-6 space-y-6 custom-scrollbar px-3">
            {isLoading ? (
              <div className="px-3 flex items-center gap-3 text-muted-foreground opacity-50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-black uppercase tracking-widest">Scanning...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="px-2 mb-2 flex items-center justify-between group">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Channels</span>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => setCreateChannelOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {channels?.filter(c => c.type === 'text').map(c => (
                      <div key={c.id} className="group flex items-center gap-1">
                        <button 
                          onClick={() => onSelectChannel(c.id)}
                          className={cn(
                            "flex-1 flex items-center px-3 py-2 rounded-xl text-sm transition-all text-left relative",
                            c.id === activeChannelId 
                              ? "bg-primary text-white font-bold shadow-lg shadow-primary/20 scale-[1.02]" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Hash className={cn("h-4 w-4 mr-2.5", c.id === activeChannelId ? "text-white" : "text-muted-foreground/50")} />
                          <span className="truncate">{c.name}</span>
                          {c.id === activeChannelId && (
                            <div className="absolute right-3">
                              <Sparkles className="h-3 w-3 text-white/40" />
                            </div>
                          )}
                        </button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                            onClick={() => setEditChannelId(c.id)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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

      <div className="p-4 bg-muted/40 border-t flex flex-col gap-4 shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative group/avatar cursor-pointer" onClick={() => setProfileOpen(true)}>
              <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover/avatar:ring-primary/50 transition-all duration-300 shadow-md">
                <AvatarImage src={userData?.photoURL || undefined} />
                <AvatarFallback className="bg-primary text-white text-xs font-black">
                  {userData?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background shadow-sm",
                userData?.onlineStatus === "online" ? "bg-green-500" : "bg-muted-foreground/30"
              )} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black truncate leading-none mb-1 text-foreground">@{userData?.username || "Loading..."}</span>
              <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase opacity-70">{userData?.onlineStatus || "offline"}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setProfileOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            <span>Made by Aniruddha with love</span>
            <Heart className="h-2.5 w-2.5 text-red-500 fill-red-500 animate-pulse" />
          </div>
        </div>
      </div>

      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>Add a new place for conversation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Channel Name</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="cname" 
                  className="pl-9" 
                  placeholder="new-channel" 
                  value={newChannelName} 
                  onChange={(e) => setNewChannelName(e.target.value)} 
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateChannelOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={isCreating || !newChannelName.trim()}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      {serverId && <ServerSettingsDialog open={serverSettingsOpen} onOpenChange={setServerSettingsOpen} serverId={serverId} />}
      {serverId && <DisappearingMessagesDialog open={disappearingOpen} onOpenChange={setDisappearingOpen} serverId={serverId} />}
      {editChannelId && (
        <ChannelSettingsDialog 
          open={!!editChannelId} 
          onOpenChange={(open) => !open && setEditChannelId(null)} 
          channelId={editChannelId} 
        />
      )}
    </aside>
  );
}
