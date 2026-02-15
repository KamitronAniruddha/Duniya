"use client";

import { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DuniyaPanel } from "@/components/duniya/duniya-panel";
import { useUser, useFirestore, useMemoFirebase, useAuth, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { Loader2, Menu, Heart } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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

  useEffect(() => {
    if (!user || !db || !auth.currentUser) return;

    const userRef = doc(db, "users", user.uid);
    const updateStatus = (status: "online" | "idle" | "offline") => {
      if (!auth.currentUser) return;
      const finalStatus = userData?.showOnlineStatus === false ? "offline" : status;
      
      setDocumentNonBlocking(userRef, {
        onlineStatus: finalStatus,
        lastOnlineAt: new Date().toISOString()
      }, { merge: true });
    };

    updateStatus("online");
    const handleVisibility = () => updateStatus(document.visibilityState === 'visible' ? "online" : "idle");
    const handleUnload = () => updateStatus("offline");

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, db, auth, userData?.showOnlineStatus]);

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
          onSelectServer={(id) => {
            if (id === "duniya") {
              setView("duniya");
              setActiveCommunityId(null);
              setActiveChannelId(null);
            } else {
              setView("chat");
              setActiveCommunityId(id);
              setActiveChannelId(null);
            }
          }} 
        />
        {view === "chat" && (
          <ChannelSidebar 
            serverId={activeCommunityId} 
            activeChannelId={activeChannelId}
            onSelectChannel={setActiveChannelId}
          />
        )}
      </div>

      <main className="flex-1 flex flex-col min-0 h-full relative overflow-hidden">
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
                    if (id === "duniya") {
                      setView("duniya");
                      setActiveCommunityId(null);
                      setActiveChannelId(null);
                    } else {
                      setView("chat");
                      setActiveCommunityId(id);
                      setActiveChannelId(null);
                    }
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
          <span className="font-bold text-sm">Duniya</span>
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
              onToggleMembers={() => setShowMembers(!showMembers)}
            />
          )}
        </div>
        
        <div className="hidden md:flex justify-center py-1 bg-background border-t">
          <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            <span>Made by Aniruddha with love</span>
            <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}