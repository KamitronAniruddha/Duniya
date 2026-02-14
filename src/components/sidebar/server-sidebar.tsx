
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ServerSidebarProps {
  activeServerId: string | null;
  onSelectServer: (id: string) => void;
}

export function ServerSidebar({ activeServerId, onSelectServer }: ServerSidebarProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const serversQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "servers"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: servers, isLoading } = useCollection(serversQuery);

  const handleCreateServer = async () => {
    if (!newServerName.trim() || !user || !db) return;
    setIsCreating(true);

    try {
      // 1. Create Server
      const serverRef = await addDoc(collection(db, "servers"), {
        name: newServerName,
        icon: `https://picsum.photos/seed/${Math.random()}/200`,
        ownerId: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp()
      });

      // 2. Create Default Channel
      await addDoc(collection(db, "channels"), {
        serverId: serverRef.id,
        name: "general",
        type: "text",
        createdAt: serverTimestamp()
      });

      // 3. Update User's servers list
      await updateDoc(doc(db, "users", user.uid), {
        serverIds: arrayUnion(serverRef.id)
      });

      toast({
        title: "Server Created!",
        description: `Your new server "${newServerName}" is ready.`,
      });

      setNewServerName("");
      setIsModalOpen(false);
      onSelectServer(serverRef.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create server",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-4 space-y-4 shrink-0 h-full overflow-y-auto custom-scrollbar">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => onSelectServer(null as any)}
              className="group relative flex items-center justify-center"
            >
              <div className={cn(
                "absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200",
                !activeServerId ? "h-8" : "h-0 group-hover:h-5"
              )} />
              <div className={cn(
                "w-12 h-12 bg-sidebar-accent flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 text-sidebar-primary-foreground group-hover:bg-primary overflow-hidden",
                !activeServerId && "rounded-[16px] bg-primary"
              )}>
                 <span className="font-bold text-lg">CV</span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">ConnectVerse Home</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-sidebar-accent rounded-full mx-auto" />

        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          servers?.map(server => (
            <Tooltip key={server.id}>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => onSelectServer(server.id)}
                  className="group relative flex items-center justify-center"
                >
                  <div className={cn(
                    "absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200",
                    activeServerId === server.id ? "h-8" : "h-0 group-hover:h-5"
                  )} />
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 overflow-hidden bg-sidebar-accent",
                    activeServerId === server.id && "rounded-[16px]"
                  )}>
                    <Avatar className="w-full h-full rounded-none">
                      <AvatarImage src={server.icon} />
                      <AvatarFallback className="bg-sidebar-accent text-white font-bold">{server.name?.[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{server.name}</TooltipContent>
            </Tooltip>
          ))
        )}

        <div className="flex-1" />

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] bg-sidebar-accent hover:bg-green-600 text-white transition-all duration-200">
                  <Plus className="h-6 w-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Create a Server</TooltipContent>
            </Tooltip>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customize your server</DialogTitle>
              <DialogDescription>
                Give your new server a personality with a name and an icon. You can always change it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="serverName">Server Name</Label>
                <Input 
                  id="serverName" 
                  placeholder="Cool Kids Club" 
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating}>Cancel</Button>
              <Button onClick={handleCreateServer} disabled={isCreating || !newServerName.trim()}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] bg-sidebar-accent hover:bg-accent text-white transition-all duration-200">
              <Compass className="h-6 w-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Explore Communities</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </aside>
  );
}
