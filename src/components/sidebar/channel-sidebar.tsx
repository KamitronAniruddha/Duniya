"use client";

import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, where, doc, serverTimestamp } from "firebase/firestore";
import { Hash, Settings, ChevronDown, LogOut, Loader2, Plus, Mic, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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

  const { data: channels, isLoading } = useCollection(channelsQuery);

  const handleLogout = () => {
    if (user && db) {
      const userRef = doc(db, "users", user.uid);
      // Use setDocumentNonBlocking for logout status to ensure it hits Firestore safely
      setDocumentNonBlocking(userRef, {
        onlineStatus: "offline",
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
    auth.signOut();
  };

  return (
    <aside className="w-60 bg-white border-r border-border flex flex-col h-full overflow-hidden shrink-0">
      {serverId ? (
        <>
          <header className="h-14 px-4 border-b flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer shrink-0">
            <h2 className="font-bold truncate text-sm">{server?.name || "..."}</h2>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </header>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
            {isLoading ? (
              <div className="px-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs">Loading...</span></div>
            ) : (
              <div className="px-2 space-y-4">
                <div>
                  <div className="px-2 mb-1 flex items-center justify-between group">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Text Channels</span>
                    <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer" />
                  </div>
                  <div className="space-y-0.5">
                    {channels?.filter(c => c.type === 'text').map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => onSelectChannel(c.id)}
                        className={cn("w-full flex items-center px-2 py-1.5 rounded-md text-sm transition-all", c.id === activeChannelId ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-gray-100")}
                      >
                        <Hash className="h-4 w-4 mr-2" />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-50">
          <Settings className="h-8 w-8 mb-4 text-muted-foreground" />
          <p className="text-xs">Select a server to view channels</p>
        </div>
      )}

      <div className="p-3 bg-gray-50 border-t flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Avatar className="h-8 w-8 ring-1 ring-border">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback className="bg-primary text-white text-[10px] font-bold">{user?.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate leading-none mb-0.5">{user?.displayName || "User"}</span>
              <span className="text-[10px] text-muted-foreground truncate leading-none">Online</span>
            </div>
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7"><Mic className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Headphones className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout}><LogOut className="h-3.5 w-3.5 text-red-400" /></Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
