
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const serversQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "servers"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: servers, isLoading } = useCollection(serversQuery);

  const handleCreateServer = async () => {
    if (!name.trim() || !user || !db) return;
    setIsCreating(true);
    try {
      const serverRef = await addDoc(collection(db, "servers"), {
        name,
        icon: `https://picsum.photos/seed/${Math.random()}/200`,
        ownerId: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "channels"), {
        serverId: serverRef.id,
        name: "general",
        type: "text",
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "users", user.uid), {
        serverIds: arrayUnion(serverRef.id)
      });

      toast({ title: "Server Created", description: `Welcome to ${name}!` });
      setName("");
      setIsModalOpen(false);
      onSelectServer(serverRef.id);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-3 gap-3 shrink-0 h-full overflow-y-auto custom-scrollbar border-r border-sidebar-border">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSelectServer(null as any)} className="group relative flex items-center justify-center">
              <div className={cn("absolute left-0 w-1 bg-white rounded-r-full transition-all", !activeServerId ? "h-8" : "h-0 group-hover:h-5")} />
              <div className={cn("w-12 h-12 bg-sidebar-accent flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all text-white", !activeServerId && "rounded-[16px] bg-primary")}>
                <span className="font-bold text-lg">CV</span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">ConnectVerse Home</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-sidebar-accent/50 rounded-full shrink-0" />

        {isLoading ? (
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
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isCreating} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateServer} disabled={isCreating || !name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </aside>
  );
}
