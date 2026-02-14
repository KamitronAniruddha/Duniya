
"use client";

import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Hash, Volume2, Settings, Headphones, Mic, ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/firebase";

interface ChannelSidebarProps {
  serverId: string | null;
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
}

export function ChannelSidebar({ serverId, activeChannelId, onSelectChannel }: ChannelSidebarProps) {
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();

  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "servers", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !serverId) return null;
    return query(collection(db, "channels"), where("serverId", "==", serverId));
  }, [db, serverId]);

  const { data: channels } = useCollection(channelsQuery);

  const handleLogout = () => {
    auth.signOut();
  };

  if (!serverId) {
    return (
      <aside className="w-60 bg-white border-r border-border flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Select a server to see channels</p>
      </aside>
    );
  }

  return (
    <aside className="w-60 bg-white border-r border-border flex flex-col h-full overflow-hidden">
      <header className="h-14 px-4 border-b flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
        <h2 className="font-bold truncate text-sm">{server?.name || "Loading..."}</h2>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        <div>
          <div className="px-2 mb-1 flex items-center justify-between group">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2">Text Channels</span>
          </div>
          <div className="px-2 space-y-0.5">
            {channels?.filter(c => c.type === 'text').map(channel => (
              <button 
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={cn(
                  "w-full flex items-center px-2 py-1.5 rounded-md transition-all group",
                  channel.id === activeChannelId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                )}
              >
                <Hash className="h-4 w-4 mr-2 shrink-0 opacity-50 group-hover:opacity-100" />
                <span className="text-sm font-medium">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="px-2 mb-1 flex items-center justify-between group">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2">Voice Channels</span>
          </div>
          <div className="px-2 space-y-0.5">
            {channels?.filter(c => c.type === 'voice').map(channel => (
              <button 
                key={channel.id}
                className="w-full flex items-center px-2 py-1.5 rounded-md text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-all group"
              >
                <Volume2 className="h-4 w-4 mr-2 shrink-0 opacity-50 group-hover:opacity-100" />
                <span className="text-sm font-medium">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 bg-gray-50 border-t flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback>{user?.displayName?.[0] || user?.email?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate leading-tight">{user?.displayName || "User"}</span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight">Online</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={handleLogout}
            className="p-1.5 rounded hover:bg-gray-200 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-200 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
