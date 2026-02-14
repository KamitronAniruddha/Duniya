
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, getDocs, limit, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass, Hash, Globe, Shield, Heart, Loader2, Share2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ServerSidebarProps {
  activeServerId: string | null;
  onSelectServer: (id: string | "duniya" | "admin") => void;
  isDuniyaActive?: boolean;
  isAdminActive?: boolean;
}

export function ServerSidebar({ activeServerId, onSelectServer, isDuniyaActive, isAdminActive }: ServerSidebarProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isAdminUser = user?.email === "aniruddha@duniya.app";

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

      const memberRef = doc(db, "communities", communityId, "members", user.uid);
      batch.set(memberRef, {
        id: user.uid,
        communityId: communityId,
        userId: user.uid,
        role: "owner",
        joinedAt: new Date().toISOString()
      });

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

      if (communityData.members?.includes(user.uid)) {
        onSelectServer(targetId);
        setIsJoinModalOpen(false);
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, "communities", targetId), {
        members: arrayUnion(user.uid)
      });
      batch.set(doc(db, "communities", targetId, "members", user.uid), {
        id: user.uid,
        communityId: targetId,
        userId: user.uid,
        role: "member",
        joinedAt: new Date().toISOString()
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

  const handleShare = (community: any) => {
    const url = `${window.location.origin}?join=${community.joinCode}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Invite Link Copied", description: "Share this link with your friends to join!" });
  };

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-4 gap-4 shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-sidebar-border shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-30">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSelectServer(null as any)} className="group relative flex items-center justify-center h-12 w-full mb-1">
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300", (!activeServerId && !isDuniyaActive && !isAdminActive) ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
              <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-300 shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-sidebar-accent text-white group-hover:bg-primary group-hover:scale-105", (!activeServerId && !isDuniyaActive && !isAdminActive) && "rounded-[12px] bg-primary")}>
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
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300", isDuniyaActive ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
              <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-300 shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white group-hover:scale-105", isDuniyaActive && "rounded-[12px] bg-accent text-white")}>
                <Globe className="h-6 w-6" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-accent">Public Directory</TooltipContent>
        </Tooltip>

        {isAdminUser && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onSelectServer("admin")} className="group relative flex items-center justify-center h-12 w-full">
                <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300", isAdminActive ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
                <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-300 shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:scale-105", isAdminActive && "rounded-[12px] bg-primary text-white")}>
                  <Shield className="h-6 w-6" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-primary">Admin Dashboard</TooltipContent>
          </Tooltip>
        )}

        <div className="w-8 h-[1px] bg-sidebar-accent/30 rounded-full shrink-0" />

        <div className="flex flex-col items-center gap-3">
          {communities?.map(s => (
            <Tooltip key={s.id}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <button onClick={() => onSelectServer(s.id)} className="group relative flex items-center justify-center h-12 w-full">
                      <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all duration-300", activeServerId === s.id ? "h-8 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-100")} />
                      <div className={cn("w-12 h-12 flex items-center justify-center transition-all duration-300 overflow-hidden shadow-lg rounded-[24px] group-hover:rounded-[12px] bg-sidebar-accent group-hover:scale-105", activeServerId === s.id && "rounded-[12px] ring-2 ring-primary ring-offset-2 ring-offset-sidebar shadow-primary/20")}>
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage src={s.icon} />
                          <AvatarFallback className="bg-primary text-white font-black text-lg">{s.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                    </button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-48">
                  <DropdownMenuItem onClick={() => onSelectServer(s.id)}>Open Community</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare(s)} className="gap-2">
                    <Share2 className="h-4 w-4" /> Share Invite Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent side="right" className="font-bold">{s.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 mt-auto mb-4">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-green-600 text-green-500 hover:text-white transition-all duration-300 shadow-md group">
                <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Community</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Community Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Group" disabled={isLoading} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateServer} disabled={isLoading || !name.trim()}>
                   {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                   Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
            <DialogTrigger asChild>
              <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-primary text-primary hover:text-white transition-all duration-300 shadow-md group">
                <Compass className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Join Community</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>5-Digit Join Code</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="e.g. 12345" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsJoinModalOpen(false)}>Cancel</Button>
                <Button onClick={handleJoinServer} disabled={isLoading || !joinId.trim()}>Join</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <div className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-all duration-500 mt-2 cursor-help group">
            <Heart className="h-3 w-3 text-red-500 fill-red-500 group-hover:scale-150 transition-transform animate-pulse" />
            <span className="text-[7px] font-black uppercase text-white/50 group-hover:text-white text-center leading-[1.2] tracking-tighter transition-colors">Aniruddha</span>
          </div>
        </div>
      </TooltipProvider>
    </aside>
  );
}
