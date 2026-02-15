
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, getDocs, limit, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass, Globe, Heart, Loader2, Settings, Share2, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ServerSettingsDialog } from "@/components/servers/server-settings-dialog";

interface ServerSidebarProps {
  activeServerId: string | null;
  onSelectServer: (id: string | "duniya") => void;
  isDuniyaActive?: boolean;
}

export function ServerSidebar({ activeServerId, onSelectServer, isDuniyaActive }: ServerSidebarProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "communities"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: communities } = useCollection(communitiesQuery);

  const generateJoinCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleCreateServer = async () => {
    if (!name.trim() || !user || !db) return;
    setIsLoading(true);
    
    try {
      const batch = writeBatch(db);
      const communityRef = doc(collection(db, "communities"));
      const communityId = communityRef.id;
      const joinCode = generateJoinCode();
      
      const communityData = {
        id: communityId,
        name: name.trim(),
        icon: `https://picsum.photos/seed/${communityId}/200`,
        ownerId: user.uid,
        admins: [],
        joinCode: joinCode,
        members: [user.uid],
        createdAt: new Date().toISOString(),
        isPublic: false
      };
      
      batch.set(communityRef, communityData);

      const channelRef = doc(collection(db, "communities", communityId, "channels"));
      batch.set(channelRef, {
        id: channelRef.id,
        communityId: communityId,
        name: "general",
        type: "text",
        createdAt: new Date().toISOString()
      });

      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, {
        serverIds: arrayUnion(communityId)
      });

      await batch.commit();
      
      toast({ title: "Community Created", description: `Welcome to ${name}!` });
      setName("");
      setIsModalOpen(false);
      onSelectServer(communityId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinServer = async () => {
    const trimmedInput = joinId.trim();
    if (!trimmedInput || !user || !db) return;
    setIsLoading(true);

    try {
      const q = query(collection(db, "communities"), where("joinCode", "==", trimmedInput), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("Community with this code not found.");
      }
      
      const communityDoc = querySnapshot.docs[0];
      const targetId = communityDoc.id;
      const communityData = communityDoc.data();

      const batch = writeBatch(db);
      batch.update(doc(db, "communities", targetId), {
        members: arrayUnion(user.uid)
      });
      batch.update(doc(db, "users", user.uid), {
        serverIds: arrayUnion(targetId)
      });

      await batch.commit();
      toast({ title: "Joined Community", description: `Welcome to ${communityData.name}!` });
      setIsJoinModalOpen(false);
      onSelectServer(targetId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Join Error", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code Copied", description: "Invite code copied to clipboard." });
  };

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-4 gap-4 shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-sidebar-border z-30">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSelectServer(null as any)} className="group relative flex items-center justify-center h-12 w-full mb-1">
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-150", (!activeServerId && !isDuniyaActive) ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
              <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-150 shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-sidebar-accent text-white group-hover:bg-primary group-hover:scale-105", (!activeServerId && !isDuniyaActive) && "rounded-[12px] bg-primary")}>
                <span className="font-black text-xl tracking-tighter italic">D</span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold">Duniya Home</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[1px] bg-sidebar-accent/30 rounded-full shrink-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSelectServer("duniya")} className="group relative flex items-center justify-center h-12 w-full">
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-150", isDuniyaActive ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
              <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-150 shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white group-hover:scale-105", isDuniyaActive && "rounded-[12px] bg-accent text-white")}>
                <Globe className="h-6 w-6" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-accent">Public Directory</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[1px] bg-sidebar-accent/30 rounded-full shrink-0" />

        <div className="flex flex-col items-center gap-3">
          {communities?.map(s => {
            const isOwner = s.ownerId === user?.uid;
            const isAdmin = isOwner || s.admins?.includes(user?.uid);

            return (
              <ContextMenu key={s.id}>
                <ContextMenuTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => onSelectServer(s.id)} className="group relative flex items-center justify-center h-12 w-full">
                        <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-150", activeServerId === s.id ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
                        <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-150 overflow-hidden shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-sidebar-accent group-hover:scale-105", activeServerId === s.id && "rounded-[12px] ring-2 ring-primary ring-offset-2 ring-offset-sidebar")}>
                          <Avatar className="w-full h-full rounded-none">
                            <AvatarImage src={s.icon} />
                            <AvatarFallback className="bg-primary text-white font-black text-lg">{s.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-bold">{s.name}</TooltipContent>
                  </Tooltip>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56 font-black uppercase text-[10px] tracking-widest p-1 border-none shadow-2xl bg-popover/95 backdrop-blur-md">
                  <ContextMenuItem onClick={() => onSelectServer(s.id)} className="gap-2 p-3 rounded-xl transition-all hover:bg-primary/10">
                    <Globe className="h-4 w-4" /> Open Community
                  </ContextMenuItem>
                  {isAdmin && (
                    <ContextMenuItem onClick={() => setEditingServerId(s.id)} className="gap-2 p-3 rounded-xl transition-all hover:bg-primary/10">
                      <Settings className="h-4 w-4" /> Edit Community Info
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => copyJoinCode(s.joinCode)} className="gap-2 p-3 rounded-xl transition-all hover:bg-primary/10">
                    <Copy className="h-4 w-4" /> Copy Join Code
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 mt-auto mb-4">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-green-600 text-green-500 hover:text-white transition-all duration-150 shadow-md group">
                <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
              <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">NEW COMMUNITY</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Community Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Group" disabled={isLoading} className="bg-muted/40 border-none rounded-2xl h-12 font-bold" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateServer} className="rounded-xl font-black shadow-lg shadow-primary/20" disabled={isLoading || !name.trim()}>
                   {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                   Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
            <DialogTrigger asChild>
              <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-primary text-primary hover:text-white transition-all duration-150 shadow-md group">
                <Compass className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
              <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">JOIN THE VERSE</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">5-Digit Join Code</Label>
                  <Input value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="e.g. 12345" className="bg-muted/40 border-none rounded-2xl h-12 font-bold text-center tracking-[0.5em]" maxLength={5} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsJoinModalOpen(false)}>Cancel</Button>
                <Button onClick={handleJoinServer} className="rounded-xl font-black shadow-lg shadow-primary/20" disabled={isLoading || !joinId.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Compass className="h-4 w-4 mr-2" />}
                  Join
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <div className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-all mt-2 group">
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
            <span className="text-[7px] font-black uppercase text-white/50 group-hover:text-white text-center leading-[1.2] tracking-tighter">Aniruddha</span>
          </div>
        </div>
      </TooltipProvider>

      {editingServerId && (
        <ServerSettingsDialog 
          open={!!editingServerId} 
          onOpenChange={(open) => !open && setEditingServerId(null)} 
          serverId={editingServerId} 
        />
      )}
    </aside>
  );
}
