"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DuniyaPanel } from "@/components/duniya/duniya-panel";
import { useUser, useFirestore, useMemoFirebase, useAuth, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, limit } from "firebase/firestore";
import { Loader2, Menu, Heart } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function DuniyaApp() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "duniya">("chat");
  const [showMembers, setShowMembers] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);

  // Auto-select first channel logic
  const channelsQuery = useMemoFirebase(() => {
    if (!db || !activeCommunityId || !user) return null;
    return query(collection(db, "communities", activeCommunityId, "channels"), limit(10));
  }, [db, activeCommunityId, user?.uid]);

  const { data: channels } = useCollection(channelsQuery);

  useEffect(() => {
    if (activeCommunityId && channels && channels.length > 0) {
      const currentChannelExistsInNewList = channels.find(c => c.id === activeChannelId);
      if (!activeChannelId || !currentChannelExistsInNewList) {
        setActiveChannelId(channels[0].id);
      }
    }
  }, [activeCommunityId, channels, activeChannelId]);

  const privacySettingsRef = useRef({ showOnlineStatus: true });
  useEffect(() => {
    if (userData) {
      privacySettingsRef.current.showOnlineStatus = userData.showOnlineStatus !== false;
    }
  }, [userData?.showOnlineStatus]);

  const lastSentStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !db || !auth.currentUser) return;

    const setPresence = (status: "online" | "idle" | "offline") => {
      const finalStatus = privacySettingsRef.current.showOnlineStatus === false ? "offline" : status;
      
      // ONLY UPDATE IF STATUS CHANGED TO PREVENT RE-RENDER LOOPS
      if (lastSentStatusRef.current !== finalStatus) {
        lastSentStatusRef.current = finalStatus;
        updateDocumentNonBlocking(doc(db, "users", user.uid), {
          onlineStatus: finalStatus,
          lastOnlineAt: new Date().toISOString()
        });
      }
    };

    setPresence("online");

    const handleVisibility = () => {
      setPresence(document.visibilityState === 'visible' ? "online" : "idle");
    };

    const handleUnload = () => {
      setPresence("offline");
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.uid, db]);

  const handleSelectServer = useCallback((id: string | "duniya") => {
    if (id === "duniya") {
      setView("duniya");
      setActiveCommunityId(null);
      setActiveChannelId(null);
    } else {
      setView("chat");
      setActiveCommunityId(id);
      setActiveChannelId(null);
    }
  }, []);

  const handleToggleMembers = useCallback(() => {
    setShowMembers(prev => !prev);
  }, []);

  if (isUserLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <div className="hidden md:flex shrink-0 h-full overflow-hidden border-r border-border">
        <ServerSidebar 
          activeServerId={view === "chat" ? activeCommunityId : view} 
          isDuniyaActive={view === "duniya"}
          onSelectServer={handleSelectServer} 
        />
        {view === "chat" && (
          <ChannelSidebar 
            serverId={activeCommunityId} 
            activeChannelId={activeChannelId}
            onSelectChannel={setActiveChannelId}
          />
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <div className="md:hidden p-2 border-b flex items-center gap-2 bg-background shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 flex w-[300px] border-none">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Select communities and channels.</SheetDescription>
              </SheetHeader>
              <div className="flex h-full w-full overflow-hidden bg-background">
                <ServerSidebar 
                  activeServerId={view === "chat" ? activeCommunityId : view} 
                  isDuniyaActive={view === "duniya"}
                  onSelectServer={(id) => {
                    handleSelectServer(id);
                    setIsMobileMenuOpen(false);
                  }} 
                />
                {view === "chat" && (
                  <ChannelSidebar 
                    serverId={activeCommunityId} 
                    activeChannelId={activeChannelId}
                    onSelectChannel={(id) => {
                      setActiveChannelId(id);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-black text-sm tracking-tight text-primary uppercase">Duniya</span>
        </div>
        
        <div className="flex-1 min-h-0 flex relative overflow-hidden">
          {view === "duniya" ? (
            <DuniyaPanel onJoinSuccess={(id) => {
              setView("chat");
              setActiveCommunityId(id);
            }} />
          ) : (
            <ChatWindow 
              channelId={activeChannelId}
              serverId={activeCommunityId}
              showMembers={showMembers}
              onToggleMembers={handleToggleMembers}
            />
          )}
        </div>
        
        <div className="hidden md:flex justify-center py-1 bg-background border-t">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            <span>Made by Aniruddha with love</span>
            <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
