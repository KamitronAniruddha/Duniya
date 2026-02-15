"use client";

import { useState } from "react";
import { Globe, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DuniyaPanel({ onJoinSuccess }: { onJoinSuccess: (serverId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/10 overflow-hidden">
      <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl">
            <Globe className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground uppercase tracking-tighter">Duniya</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Public Directory</p>
          </div>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Duniya..." 
            className="pl-9 bg-muted/40 border-none rounded-xl h-9 text-foreground" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="p-12 bg-accent/5 rounded-[3.5rem] relative z-10">
            <Globe className="h-24 w-24 text-accent/20" />
          </div>
          <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full opacity-20" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">DIRECTORY CLEARED</h3>
          <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] leading-relaxed opacity-60">
            The Verse discovery engine is currently in maintenance. Check back later for public communities.
          </p>
          <div className="flex items-center justify-center gap-2 pt-4">
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">Made by Aniruddha with love</span>
          </div>
        </div>
      </div>
    </div>
  );
}
