"use client";

import { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AISuggestionPanel } from "@/components/ai/ai-suggestion-panel";
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase";
import { doc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { Loader2, Menu } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function ConnectVerseApp() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !activeServerId) return null;
    return query(collection(db, "channels"), where("serverId", "==", activeServerId));
  }, [db, activeServerId]);

  const { data: channels } = useCollection(channelsQuery);

  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, "users", user.uid);
    
    const updateStatus = (status: "online" | "idle" | "offline") => {
      if (!auth.currentUser) return;
      
      setDocumentNonBlocking(userRef, {
        onlineStatus: status,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    updateStatus("online");

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateStatus("online");
      } else {
        updateStatus("idle");
      }
    };

    const handleUnload = () => {
      updateStatus("offline");
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      if (auth.currentUser?.uid === user.uid) {
        updateStatus("offline");
      }
    };
  }, [user, db, auth]);

  if (isUserLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Connecting to Verse...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      {/* Desktop Sidebars */}
      <div className="hidden md:flex shrink-0 h-full overflow-hidden border-r border-border">
        <ServerSidebar 
          activeServerId={activeServerId} 
          onSelectServer={(id) => {
            setActiveServerId(id);
            setActiveChannelId(null); 
          }} 
        />
        <ChannelSidebar 
          serverId={activeServerId} 
          activeChannelId={activeChannelId}
          onSelectChannel={setActiveChannelId}
        />
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white">
        {/* Mobile Header with Menu */}
        <div className="md:hidden p-2 border-b flex items-center gap-2 bg-white shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 flex w-[300px] border-none">
              <div className="flex h-full w-full overflow-hidden">
                <ServerSidebar 
                  activeServerId={activeServerId} 
                  onSelectServer={(id) => {
                    setActiveServerId(id);
                    setActiveChannelId(null); 
                  }} 
                />
                <ChannelSidebar 
                  serverId={activeServerId} 
                  activeChannelId={activeChannelId}
                  onSelectChannel={setActiveChannelId}
                />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-bold text-sm truncate">ConnectVerse</span>
        </div>
        
        {/* Important: flex-1 min-h-0 ensures the child can shrink and scroll */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatWindow 
            channelId={activeChannelId}
            serverId={activeServerId}
          />
        </div>
      </main>

      {/* Desktop AI Panel */}
      <div className="hidden lg:block shrink-0 h-full max-h-full">
        <AISuggestionPanel channelId={activeChannelId} />
      </div>
    </div>
  );
}