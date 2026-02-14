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

  // Track previous serverIds to detect removal
  const prevServerIdsRef = useRef<string[]>([]);
  const hasLoadedInitialData = useRef(false);

  const userRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !activeServerId || !user) return null;
    return query(collection(db, "channels"), where("serverId", "==", activeServerId));
  }, [db, activeServerId, user?.uid]);

  const { data: channels } = useCollection(channelsQuery);

  // Monitor membership changes to alert the user if removed
  useEffect(() => {
    if (!userData) return;
    
    const currentIds = userData.serverIds || [];
    const prevIds = prevServerIdsRef.current;

    // Only trigger removal alert if we had previous server data
    // and the active server was in that previous list but is now missing.
    // We check prevIds.length > 0 to ensure we've synchronized at least once.
    if (hasLoadedInitialData.current && activeServerId && prevIds.length > 0) {
      const wasInServer = prevIds.includes(activeServerId);
      const isInServerNow = currentIds.includes(activeServerId);

      if (wasInServer && !isInServerNow) {
        toast({
          variant: "destructive",
          title: "Access Revoked",
          description: "You have been removed from the server by an administrator.",
        });
        setActiveServerId(null);
        setActiveChannelId(null);
      }
    }

    // Update the ref for the next comparison
    prevServerIdsRef.current = currentIds;
    if (userData) {
      hasLoadedInitialData.current = true;
    }
  }, [userData?.serverIds, activeServerId, toast]);

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

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white">
        {/* Mobile Header */}
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
        
        {/* Chat and Members Wrapper */}
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
