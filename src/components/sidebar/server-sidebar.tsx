
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, where, serverTimestamp, doc, arrayUnion, getDocs, limit, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Loader2, Compass, Hash, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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

  const serversQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "servers"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: servers, isLoading: isServersLoading } = useCollection(serversQuery);

  const generateJoinCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleCreateServer = () => {
    if (!name.trim() || !user || !db) return;
    setIsLoading(true);
    
    try {
      const batch = writeBatch(db);
      
      const serverRef = doc(collection(db, "servers"));
      const serverId = serverRef.id;
      const joinCode = generateJoinCode();
      
      const serverData = {
        id: serverId,
        name: name.trim(),
        icon: `https://picsum.photos/seed/${serverId}/200`,
        ownerId: user.uid,
        admins: [],
        joinCode: joinCode,
        members: [user.uid],
        createdAt: serverTimestamp(),
        isBroadcasted: false
      };
      batch.set(serverRef, serverData);

      const channelRef = doc(collection(db, "channels"));
      const channelData = {
        id: channelRef.id,
        serverId: serverId,
        name: "general",
        type: "text",
        createdAt: serverTimestamp()
      };
      batch.set(channelRef, channelData);

      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, {
        serverIds: arrayUnion(serverId)
      });

      batch.commit().catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: serverRef.path,
          operation: 'create',
          requestResourceData: serverData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({ title: "Server Created", description: `Welcome to ${name}! Join code: ${joinCode}` });
      setName("");
      setIsModalOpen(false);
      onSelectServer(serverId);
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
      let targetServerId = trimmedInput;
      let serverData: any = null;

      if (trimmedInput.length === 5 && /^\d+$/.test(trimmedInput)) {
        const q = query(collection(db, "servers"), where("joinCode", "==", trimmedInput), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          throw new Error("Server with this code not found.");
        }
        const serverDoc = querySnapshot.docs[0];
        targetServerId = serverDoc.id;
        serverData = serverDoc.data();
      } else {
        const q = query(collection(db, "servers"), where("id", "==", trimmedInput), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          throw new Error("Server not found. Please check the ID or code.");
        }
        targetServerId = querySnapshot.docs[0].id;
        serverData = querySnapshot.docs[0].data();
      }

      if (serverData.members?.includes(user.uid)) {
        toast({ title: "Already a member", description: "You are already in this server." });
        onSelectServer(targetServerId);
        setIsJoinModalOpen(false);
        return;
      }

      const serverRef = doc(db, "servers", targetServerId);
      setDocumentNonBlocking(serverRef, {
        members: arrayUnion(user.uid)
      }, { merge: true });

      const userRef = doc(db, "users", user.uid);
      setDocumentNonBlocking(userRef, {
        serverIds: arrayUnion(targetServerId)
      }, { merge: true });

      toast({ title: "Joined Server", description: `You have joined ${serverData.name}!` });
      setJoinId("");
      setIsJoinModalOpen(false);
      onSelectServer(targetServerId);
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Join Error", 
        description: e.message || "Could not join server." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-3 gap-3 shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-sidebar-border">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSelectServer(null as any)} className="group relative flex items-center justify-center">
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all", (!activeServerId && !isDuniyaActive) ? "h-8" : "h-0 group-hover:h-5")} />
              <div className={cn("w-12 h-12 bg-sidebar-accent flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all text-white", (!activeServerId && !isDuniyaActive) && "rounded-[16px] bg-primary")}>
                <span className="font-bold text-lg">CV</span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">ConnectVerse Home</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-sidebar-accent/50 rounded-full shrink-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSelectServer("duniya")} className="group relative flex items-center justify-center">
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all", isDuniyaActive ? "h-8" : "h-0 group-hover:h-5")} />
              <div className={cn("w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden bg-accent/20 text-accent", isDuniyaActive && "rounded-[16px] bg-accent text-white")}>
                <Globe className="h-6 w-6" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Duniya (Public Directory)</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-sidebar-accent/50 rounded-full shrink-0" />

        {isServersLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        ) : (
          servers?.map(s => (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button onClick={() => onSelectServer(s.id)} className="group relative flex items-center justify-center">
                  <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all", activeServerId === s.id ? "h-8" : "h-0 group-hover:h-5")} />
                  <div className={cn("w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden bg-sidebar-accent", activeServerId === s.id && "rounded-[16px]")}>
                    <Avatar className="w-full h-full rounded-none">
                      <AvatarImage src={s.icon} />
                      <AvatarFallback className="bg-sidebar-accent text-white font-bold">{s.name?.[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{s.name}</TooltipContent>
            </Tooltip>
          ))
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] bg-sidebar-accent hover:bg-green-600 text-green-500 hover:text-white transition-all">
              <Plus className="h-6 w-6" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create your server</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Server Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Cool Server" disabled={isLoading} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateServer} disabled={isLoading || !name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
          <DialogTrigger asChild>
            <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] bg-sidebar-accent hover:bg-primary text-primary hover:text-white transition-all">
              <Compass className="h-6 w-6" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Join a Server</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Server ID or 5-Digit Code</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-9"
                    value={joinId} 
                    onChange={(e) => setJoinId(e.target.value)} 
                    placeholder="e.g. 12345" 
                    disabled={isLoading} 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Enter a 5-digit join code or a full server ID.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsJoinModalOpen(false)}>Cancel</Button>
              <Button onClick={handleJoinServer} disabled={isLoading || !joinId.trim()}>Join Server</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </aside>
  );
}
