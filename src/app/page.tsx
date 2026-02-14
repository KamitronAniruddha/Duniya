
"use client";

import { useState, useEffect, useRef } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { MembersPanel } from "@/components/members/members-panel";
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from "@/firebase";
import { doc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { Loader2, Menu } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ConnectVerseApp() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Track state for notifications
  const prevServerIdsRef = useRef<string[]>([]);
  const prevMembersRef = useRef<string[]>([]);
  const hasLoadedInitialData = useRef(false);

  const userRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);

  const activeServerRef = useMemoFirebase(() => (activeServerId ? doc(db, "servers", activeServerId) : null), [db, activeServerId]);
  const { data: serverData } = useDoc(activeServerRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !activeServerId || !user) return null;
    return query(collection(db, "channels"), where("serverId", "==", activeServerId));
  }, [db, activeServerId, user?.uid]);

  const { data: channels } = useCollection(channelsQuery);

  // Monitor membership changes (Removals and New Joins)
  useEffect(() => {
    if (!userData || !serverData) return;
    
    // 1. Check for personal removal from servers
    const currentServerIds = userData.serverIds || [];
    const prevServerIds = prevServerIdsRef.current;

    if (hasLoadedInitialData.current && activeServerId && prevServerIds.length > 0) {
      if (prevServerIds.includes(activeServerId) && !currentServerIds.includes(activeServerId)) {
        toast({
          variant: "destructive",
          title: "Access Revoked",
          description: "You have been removed from the server.",
        });
        setActiveServerId(null);
        setActiveChannelId(null);
      }
    }
    prevServerIdsRef.current = currentServerIds;

    // 2. Check for new members in the active server
    const currentMembers = serverData.members || [];
    const prevMembers = prevMembersRef.current;

    if (hasLoadedInitialData.current && prevMembers.length > 0 && currentMembers.length > prevMembers.length) {
      const newMemberId = currentMembers.find(id => !prevMembers.includes(id));
      if (newMemberId && newMemberId !== user?.uid) {
        toast({
          title: "New Member!",
          description: "Someone new just joined the server. Say hello!",
        });
      }
    }
    prevMembersRef.current = currentMembers;

    hasLoadedInitialData.current = true;
  }, [userData?.serverIds, serverData?.members, activeServerId, toast, user?.uid]);

  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (!user || !db || !auth.currentUser) return;

    const userRef = doc(db, "users", user.uid);
    const updateStatus = (status: "online" | "idle" | "offline") => {
      if (!auth.currentUser) return;
      setDocumentNonBlocking(userRef, {
        onlineStatus: status,
        lastSeen: serverTimestamp()
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
  }, [user, db, auth]);

  if (isUserLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
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
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/20">
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

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white">
        <div className="md:hidden p-2 border-b flex items-center gap-2 bg-white shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 flex w-[300px] border-none">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Select servers and channels to chat.</SheetDescription>
              </SheetHeader>
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
                  onSelectChannel={(id) => {
                    setActiveChannelId(id);
                    setIsMobileMenuOpen(false);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-bold text-sm truncate">ConnectVerse</span>
        </div>
        
        <div className="flex-1 min-h-0 flex relative overflow-hidden">
          <ChatWindow 
            channelId={activeChannelId}
            serverId={activeServerId}
            showMembers={showMembers}
            onToggleMembers={() => setShowMembers(!showMembers)}
          />
          
          {showMembers && activeServerId && (
            <div className="hidden lg:block h-full border-l">
              <MembersPanel serverId={activeServerId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
