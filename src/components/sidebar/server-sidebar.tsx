
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, getDocs, limit, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass, Globe, Heart, Loader2, Settings, Share2, Copy, Check, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ServerSettingsDialog } from "@/components/servers/server-settings-dialog";
import { CommunityProfileDialog } from "@/components/communities/community-profile-dialog";
import { CreateCommunityDialog } from "@/components/servers/create-community-dialog";
import { JoinVerseDialog } from "@/components/servers/join-verse-dialog";

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
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "communities"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: communities } = useCollection(communitiesQuery);

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code Copied" });
  };

  const copyInviteLink = (id: string) => {
    const link = `${window.location.origin}/invite/${id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Invite Link Copied" });
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
          <TooltipContent side="right" className="font-bold text-[10px] uppercase tracking-widest">Duniya Home</TooltipContent>
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
          <TooltipContent side="right" className="font-bold text-accent text-[10px] uppercase tracking-widest">Public Directory</TooltipContent>
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
                            <AvatarImage src={s.icon} className="object-cover" />
                            <AvatarFallback className="bg-primary text-white font-black text-lg">{s.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-bold text-[10px] uppercase tracking-widest">{s.name}</TooltipContent>
                  </Tooltip>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56 font-black uppercase text-[10px] tracking-widest p-1 border-none shadow-2xl bg-popover/95 backdrop-blur-md">
                  <ContextMenuItem onClick={() => onSelectServer(s.id)} className="gap-2 p-3 rounded-xl hover:bg-primary/10"><Globe className="h-4 w-4" /> Open Community</ContextMenuItem>
                  <ContextMenuItem onClick={() => setViewingProfileId(s.id)} className="gap-2 p-3 rounded-xl hover:bg-primary/10"><Info className="h-4 w-4" /> View Profile</ContextMenuItem>
                  <ContextMenuItem onClick={() => copyInviteLink(s.id)} className="gap-2 p-3 rounded-xl hover:bg-primary/10"><Share2 className="h-4 w-4" /> Copy Invite Link</ContextMenuItem>
                  {isAdmin && <ContextMenuItem onClick={() => setEditingServerId(s.id)} className="gap-2 p-3 rounded-xl hover:bg-primary/10"><Settings className="h-4 w-4" /> Community Settings</ContextMenuItem>}
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => copyJoinCode(s.joinCode)} className="gap-2 p-3 rounded-xl hover:bg-primary/10"><Copy className="h-4 w-4" /> Copy Join Code</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 mt-auto mb-4">
          <CreateCommunityDialog open={isModalOpen} onOpenChange={setIsModalOpen} onCreated={onSelectServer} />

          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setIsJoinModalOpen(true)}
                className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[12px] bg-sidebar-accent hover:bg-primary text-primary hover:text-white transition-all duration-150 shadow-md group"
              >
                <Compass className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-[10px] uppercase tracking-widest">Join Portal</TooltipContent>
          </Tooltip>
          
          <div className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-all mt-2">
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
            <span className="text-[7px] font-black uppercase text-white/50 text-center leading-[1.2] tracking-tighter">Aniruddha</span>
          </div>
        </div>
      </TooltipProvider>

      <JoinVerseDialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen} onJoined={onSelectServer} />
      {editingServerId && <ServerSettingsDialog open={!!editingServerId} onOpenChange={(open) => !open && setEditingServerId(null)} serverId={editingServerId} />}
      {viewingProfileId && <CommunityProfileDialog open={!!viewingProfileId} onOpenChange={(open) => !open && setViewingProfileId(null)} serverId={viewingProfileId} />}
    </aside>
  );
}
