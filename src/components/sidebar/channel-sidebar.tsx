
"use client";

import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Hash, Volume2, Settings, ChevronDown, LogOut, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
  const { data: server, isLoading: serverLoading } = useDoc(serverRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !serverId) return null;
    return query(collection(db, "channels"), where("serverId", "==", serverId));
  }, [db, serverId]);

  const { data: channels, isLoading: channelsLoading } = useCollection(channelsQuery);

  const handleLogout = async () => {
    if (user && db) {
      await updateDoc(doc(db, "users", user.uid), {
        onlineStatus: "offline",
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
    auth.signOut();
  };

  if (!serverId) {
    return (
      <aside className="w-60 bg-white border-r border-border flex flex-col h-full overflow-hidden shrink-0">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-muted-foreground opacity-30" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Select a server from the left sidebar to view channels</p>
        </div>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start text-xs h-9" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-60 bg-white border-r border-border flex flex-col h-full overflow-hidden shrink-0">
      <header className="h-14 px-4 border-b flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group shrink-0">
        <h2 className="font-bold truncate text-sm">{serverLoading ? "Loading..." : server?.name}</h2>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar">
        {channelsLoading ? (
          <div className="px-6 flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading channels...</span>
          </div>
        ) : (
          <>
            <div>
              <div className="px-2 mb-1 flex items-center justify-between group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2">Text Channels</span>
                <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
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
                    <Hash className={cn(
                      "h-4 w-4 mr-2 shrink-0 transition-opacity",
                      channel.id === activeChannelId ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                    )} />
                    <span className="text-sm font-semibold truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="px-2 mb-1 flex items-center justify-between group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2">Voice Channels</span>
                <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-all">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <div className="px-2 space-y-0.5">
                {channels?.filter(c => c.type === 'voice').map(channel => (
                  <button 
                    key={channel.id}
                    className="w-full flex items-center px-2 py-1.5 rounded-md text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-all group"
                  >
                    <Volume2 className="h-4 w-4 mr-2 shrink-0 opacity-40 group-hover:opacity-100" />
                    <span className="text-sm font-semibold truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {user?.displayName?.[0] || user?.email?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate leading-tight">{user?.displayName || "User"}</span>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              <span className="text-[10px] text-muted-foreground truncate leading-tight">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg hover:bg-gray-200 text-muted-foreground hover:text-red-500 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-gray-200 text-muted-foreground hover:text-primary transition-all">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
