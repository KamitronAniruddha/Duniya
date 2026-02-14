
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, where, doc, serverTimestamp } from "firebase/firestore";
import { Hash, Settings, ChevronDown, LogOut, Loader2, Plus, Edit2, Copy, Share2, Timer, Heart } from "lucide-react";
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
      setDocumentNonBlocking(userRef, {
        onlineStatus: "offline",
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
    setTimeout(() => auth.signOut(), 100);
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

  const copyJoinCode = () => {
    if (server?.joinCode) {
      navigator.clipboard.writeText(server.joinCode);
      toast({ title: "Code Copied!", description: `Join code ${server.joinCode} copied to clipboard.` });
    }
  };

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0">
      {serverId ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <header className="h-14 px-4 border-b flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer shrink-0">
                <div className="flex flex-col min-w-0">
                  <h2 className="font-bold truncate text-sm">{server?.name || "..."}</h2>
                  {server?.joinCode && <span className="text-[9px] text-primary font-mono font-bold tracking-widest uppercase">Code: {server.joinCode}</span>}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </header>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {isAdmin && (
                <DropdownMenuItem onClick={() => setDisappearingOpen(true)} className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  Disappearing Messages
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem onClick={() => setServerSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Server Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {server?.joinCode && (
                <DropdownMenuItem onClick={copyJoinCode}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy Join Code ({server.joinCode})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(serverId);
                toast({ title: "Copied!", description: "Server ID copied to clipboard." });
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Server ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive font-medium">Leave Server</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
            {isLoading ? (
              <div className="px-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : (
              <div className="px-2 space-y-4">
                <div>
                  <div className="px-2 mb-1 flex items-center justify-between group">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Text Channels</span>
                    {isAdmin && (
                      <button onClick={() => setCreateChannelOpen(true)}>
                        <Plus className="h-3 w-3 text-muted-foreground opacity-100 sm:opacity-0 group-hover:opacity-100 cursor-pointer hover:text-primary transition-all" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {channels?.filter(c => c.type === 'text').map(c => (
                      <div key={c.id} className="group flex items-center gap-1">
                        <button 
                          onClick={() => onSelectChannel(c.id)}
                          className={cn(
                            "flex-1 flex items-center px-2 py-1.5 rounded-md text-sm transition-all",
                            c.id === activeChannelId 
                              ? "bg-primary/10 text-primary font-bold" 
                              : "text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <Hash className="h-4 w-4 mr-2" />
                          <span className="truncate">{c.name}</span>
                        </button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditChannelId(c.id)}
                          >
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-50">
          <Settings className="h-8 w-8 mb-4 text-muted-foreground" />
          <p className="text-xs">Select a community to view channels</p>
        </div>
      )}

      <div className="p-3 bg-muted/30 border-t flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Avatar className="h-8 w-8 ring-1 ring-border shadow-sm border border-border">
                <AvatarImage src={userData?.photoURL || undefined} />
                <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                  {userData?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                userData?.onlineStatus === "online" ? "bg-green-500" : "bg-muted-foreground/30"
              )} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate leading-none mb-0.5">{userData?.username || "Loading..."}</span>
              <span className="text-[10px] text-muted-foreground truncate leading-none capitalize">{userData?.onlineStatus || "offline"}</span>
            </div>
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setProfileOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-all duration-300">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em]">
            <span>Made by Aniruddha with love</span>
            <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />
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
