"use client";

import { MOCK_SERVERS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Compass, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ServerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-4 space-y-4 shrink-0 h-full">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/" className="group relative flex items-center justify-center">
              <div className={cn(
                "absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200",
                pathname === "/" ? "h-8" : "h-0 group-hover:h-5"
              )} />
              <div className={cn(
                "w-12 h-12 bg-sidebar-accent flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 text-sidebar-primary-foreground group-hover:bg-primary overflow-hidden",
                pathname === "/" && "rounded-[16px] bg-primary"
              )}>
                 <span className="font-bold text-lg">CV</span>
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">ConnectVerse Home</TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-sidebar-accent rounded-full mx-auto" />

        {MOCK_SERVERS.map(server => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <Link href={`/server/${server.id}`} className="group relative flex items-center justify-center">
                <div className={cn(
                  "absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200",
                  pathname.includes(server.id) ? "h-8" : "h-0 group-hover:h-5"
                )} />
                <div className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 overflow-hidden bg-sidebar-accent",
                  pathname.includes(server.id) && "rounded-[16px]"
                )}>
                  <Avatar className="w-full h-full rounded-none">
                    <AvatarImage src={server.icon} />
                    <AvatarFallback>{server.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </Link>
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