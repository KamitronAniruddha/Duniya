
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DuniyaPanel } from "@/components/duniya/duniya-panel";
import { useUser, useFirestore, useMemoFirebase, useAuth, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, limit } from "firebase/firestore";
import { Loader2, Menu, Heart, Monitor, Tablet, Smartphone, Globe, MessageSquare, User, Compass } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { InvitationManager } from "@/components/invitations/invitation-manager";
import { cn } from "@/lib/utils";
import { ProfileDialog } from "@/components/profile/profile-dialog";

export default function DuniyaApp() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "duniya">("chat");
  const [showMembers, setShowMembers] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Active Tab for Mobile/Tablet Modes
  const [activeTab, setActiveTab] = useState<"chat" | "explore" | "profile">("chat");

  const userRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);

  const mode = userData?.interfaceMode || "laptop";

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !activeCommunityId || !user) return null;
    return query(collection(db, "communities", activeCommunityId, "channels"), limit(10));
  }, [db, activeCommunityId, user?.uid]);

  const { data: channels } = useCollection(channelsQuery);

  useEffect(() => {
    if (activeCommunityId && channels && channels.length > 0) {
      const firstChannelId = channels[0].id;
      if (!activeChannelId || !channels.some(c => c.id === activeChannelId)) {
        setActiveChannelId(firstChannelId);
      }
    }
  }, [activeCommunityId, channels?.length]);

  const lastSentStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !db || !auth.currentUser) return;

    const setPresence = (status: "online" | "idle" | "offline") => {
      const showStatus = userData?.showOnlineStatus !== false;
      const finalStatus = showStatus ? status : "offline";
      
      if (lastSentStatusRef.current !== finalStatus || (finalStatus !== "offline" && Math.random() > 0.8)) {
        lastSentStatusRef.current = finalStatus;
        updateDocumentNonBlocking(doc(db, "users", user.uid), {
          onlineStatus: finalStatus,
          lastOnlineAt: new Date().toISOString()
        });
      }
    };

    setPresence(document.visibilityState === 'visible' ? "online" : "idle");

    const handleVisibility = () => {
      setPresence(document.visibilityState === 'visible' ? "online" : "idle");
    };

    const handleFocus = () => setPresence("online");
    const handleBlur = () => setPresence("idle");

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', () => setPresence("offline"));

    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setPresence("online");
      }
    }, 60000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(heartbeat);
      setPresence("offline");
    };
  }, [user?.uid, db, auth.currentUser, userData?.showOnlineStatus]);

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

  // --- INTERFACE MODES ---

  const renderLaptopLayout = () => (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex shrink-0 h-full overflow-hidden border-r border-border">
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
      </main>
    </div>
  );

  const renderTabletLayout = () => (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      {/* Side Rail Navigation */}
      <aside className="w-20 bg-background border-r flex flex-col items-center py-6 gap-8 z-30 shadow-sm">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Tablet className="h-6 w-6 text-primary" />
        </div>
        <nav className="flex flex-col gap-4">
          <Button 
            variant={activeTab === "chat" ? "default" : "ghost"} 
            size="icon" 
            className="h-12 w-12 rounded-2xl"
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
          <Button 
            variant={activeTab === "explore" ? "default" : "ghost"} 
            size="icon" 
            className="h-12 w-12 rounded-2xl"
            onClick={() => setActiveTab("explore")}
          >
            <Compass className="h-6 w-6" />
          </Button>
          <Button 
            variant={activeTab === "profile" ? "default" : "ghost"} 
            size="icon" 
            className="h-12 w-12 rounded-2xl"
            onClick={() => setIsProfileOpen(true)}
          >
            <User className="h-6 w-6" />
          </Button>
        </nav>
        <div className="mt-auto pb-4">
          <Heart className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {activeTab === "chat" ? (
          <div className="flex h-full w-full">
            <div className="w-72 border-r bg-background/50 backdrop-blur-md hidden lg:block">
              <ServerSidebar 
                activeServerId={activeCommunityId} 
                onSelectServer={handleSelectServer} 
              />
              <ChannelSidebar 
                serverId={activeCommunityId} 
                activeChannelId={activeChannelId}
                onSelectChannel={setActiveChannelId}
              />
            </div>
            <div className="flex-1">
              <ChatWindow 
                channelId={activeChannelId}
                serverId={activeCommunityId}
                showMembers={false}
              />
            </div>
          </div>
        ) : (
          <DuniyaPanel onJoinSuccess={(id) => {
            setActiveTab("chat");
            handleSelectServer(id);
          }} />
        )}
      </main>
    </div>
  );

  const renderMobileLayout = () => (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <main className="flex-1 relative overflow-hidden">
        {activeTab === "chat" ? (
          <div className="flex h-full w-full">
            {!activeCommunityId ? (
              <div className="flex-1 flex flex-col p-4">
                <header className="py-6 flex items-center justify-between">
                  <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">Chat</h1>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsProfileOpen(true)}>
                    <User className="h-6 w-6" />
                  </Button>
                </header>
                <div className="flex-1 overflow-y-auto">
                  <ServerSidebar 
                    activeServerId={null} 
                    onSelectServer={handleSelectServer} 
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full relative">
                <ChatWindow 
                  channelId={activeChannelId}
                  serverId={activeCommunityId}
                  showMembers={false}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md rounded-full shadow-md"
                  onClick={() => setActiveCommunityId(null)}
                >
                  Back
                </Button>
              </div>
            )}
          </div>
        ) : activeTab === "explore" ? (
          <DuniyaPanel onJoinSuccess={(id) => {
            setActiveTab("chat");
            handleSelectServer(id);
          }} />
        ) : (
          <div className="h-full w-full flex items-center justify-center p-8 text-center opacity-50">
            <div className="flex flex-col items-center gap-4">
              <User className="h-16 w-16" />
              <h2 className="text-xl font-bold">Profile View</h2>
              <Button onClick={() => setIsProfileOpen(true)}>Open Settings</Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="h-16 border-t bg-background flex items-center justify-around shrink-0 z-50">
        <button 
          className={cn("flex flex-col items-center gap-1 p-2 transition-all", activeTab === "chat" ? "text-primary" : "text-muted-foreground")}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Messages</span>
        </button>
        <button 
          className={cn("flex flex-col items-center gap-1 p-2 transition-all", activeTab === "explore" ? "text-primary" : "text-muted-foreground")}
          onClick={() => setActiveTab("explore")}
        >
          <Globe className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Duniya</span>
        </button>
        <button 
          className={cn("flex flex-col items-center gap-1 p-2 transition-all", activeTab === "profile" ? "text-primary" : "text-muted-foreground")}
          onClick={() => setIsProfileOpen(true)}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
        </button>
      </nav>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-body">
      <InvitationManager />
      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
      
      {mode === "mobile" ? renderMobileLayout() : mode === "tablet" ? renderTabletLayout() : renderLaptopLayout()}
      
      <div className="hidden md:flex fixed bottom-1 right-4 items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 pointer-events-none z-50">
        <span>Made by Aniruddha with love</span>
        <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />
      </div>
    </div>
  );
}
