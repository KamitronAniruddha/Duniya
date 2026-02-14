
"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass } from "lucide-react";

interface ServerSidebarProps {
  activeServerId: string | null;
  onSelectServer: (id: string) => void;
}

export function ServerSidebar({ activeServerId, onSelectServer }: ServerSidebarProps) {
  const db = useFirestore();
  const { user } = useUser();

  const serversQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "servers"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);

  const { data: servers, isLoading } = useCollection(serversQuery);

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-4 space-y-4 shrink-0 h-full">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => onSelectServer("")}
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

        {servers?.map(server => (
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
                    <AvatarFallback>{server.name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{server.name}</TooltipContent>
          </Tooltip>
        ))}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-12 h-12 flex items-center justify-center rounded-[24px] hover:rounded-[16px] bg-sidebar-accent hover:bg-accent text-white transition-all duration-200">
              <Plus className="h-6 w-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Add a Server</TooltipContent>
        </Tooltip>

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
