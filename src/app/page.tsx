
"use client";

import { useState, useEffect, useRef } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { MembersPanel } from "@/components/members/members-panel";
import { DuniyaPanel } from "@/components/duniya/duniya-panel";
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, getDoc, onSnapshot, orderBy, limit } from "firebase/firestore";
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
  const [isDuniyaActive, setIsDuniyaActive] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for tracking and cleanup
  const prevServerIdsRef = useRef<string[]>([]);
  const prevMembersRef = useRef<string[]>([]);
  const lastMessageIdsRef = useRef<Record<string, string>>({});
  const channelUnsubsRef = useRef<Map<string, () => void>>(new Map());
  const hasLoadedInitialData = useRef(false);

  const userRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);

  const activeServerRef = useMemoFirebase(() => (activeServerId ? doc(db, "servers", activeServerId) : null), [db, activeServerId]);
  const { data: serverData } = useDoc(activeServerRef);

  // Optimized notification listener management
  useEffect(() => {
    if (!db || !activeServerId || !user || !hasLoadedInitialData.current) {
      // Cleanup all inner listeners if server becomes inactive
      channelUnsubsRef.current.forEach(unsub => unsub());
      channelUnsubsRef.current.clear();
      return;
    }

    const channelsQuery = query(collection(db, "channels"), where("serverId", "==", activeServerId));
    
    const unsubChannels = onSnapshot(channelsQuery, (snapshot) => {
      const currentChannelIdsInSnapshot = snapshot.docs.map(d => d.id);
      
      // 1. Remove listeners for channels that no longer exist
      channelUnsubsRef.current.forEach((unsub, id) => {
        if (!currentChannelIdsInSnapshot.includes(id)) {
          unsub();
          channelUnsubsRef.current.delete(id);
        }
      });

      // 2. Add listeners for new channels
      snapshot.docs.forEach((channelDoc) => {
        const channelId = channelDoc.id;
        const channelName = channelDoc.data().name;

        if (!channelUnsubsRef.current.has(channelId)) {
          const messagesQuery = query(
            collection(db, "messages", channelId, "chatMessages"),
            orderBy("createdAt", "desc"),
            limit(1)
          );

          const unsubMsg = onSnapshot(messagesQuery, async (msgSnapshot) => {
            if (msgSnapshot.empty) return;
            const lastMsg = msgSnapshot.docs[0].data();
            const lastMsgId = msgSnapshot.docs[0].id;

            // Only notify if:
            // - It's not our message
            // - We've seen this channel before (avoid initial load popups)
            // - It's a new message ID we haven't seen this session
            // - We aren't currently looking at the channel
            if (
              lastMsg.senderId !== user.uid && 
              lastMessageIdsRef.current[channelId] && 
              lastMessageIdsRef.current[channelId] !== lastMsgId &&
              activeChannelId !== channelId
            ) {
              const senderRef = doc(db, "users", lastMsg.senderId);
              const senderSnap = await getDoc(senderRef);
              const senderName = senderSnap.exists() ? senderSnap.data().username : "Someone";

              const { dismiss } = toast({
                title: `New Message in #${channelName}`,
                description: `@${senderName}: ${lastMsg.text.length > 60 ? lastMsg.text.substring(0, 60) + "..." : lastMsg.text}`,
                action: (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setActiveChannelId(channelId);
                      dismiss();
                    }}
                  >
                    Reply
                  </Button>
                ),
              });
            }
            lastMessageIdsRef.current[channelId] = lastMsgId;
          });

          channelUnsubsRef.current.set(channelId, unsubMsg);
        }
      });
    });

    return () => {
      unsubChannels();
      channelUnsubsRef.current.forEach(unsub => unsub());
      channelUnsubsRef.current.clear();
    };
  }, [db, activeServerId, user, activeChannelId, toast]);

  // Monitor membership changes (Access Revoked / New Members)
  useEffect(() => {
    if (!userData) return;
    
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

    if (serverData) {
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
    }

    hasLoadedInitialData.current = true;
  }, [userData?.serverIds, serverData?.members, activeServerId, toast, user?.uid, userData]);

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
          isDuniyaActive={isDuniyaActive}
          onSelectServer={(id) => {
            if (id === "duniya") {
              setIsDuniyaActive(true);
              setActiveServerId(null);
              setActiveChannelId(null);
            } else {
              setIsDuniyaActive(false);
              setActiveServerId(id);
              setActiveChannelId(null);
            }
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
                  isDuniyaActive={isDuniyaActive}
                  onSelectServer={(id) => {
                    if (id === "duniya") {
                      setIsDuniyaActive(true);
                      setActiveServerId(null);
                      setActiveChannelId(null);
                    } else {
                      setIsDuniyaActive(false);
                      setActiveServerId(id);
                      setActiveChannelId(null);
                    }
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
          {isDuniyaActive ? (
            <DuniyaPanel onJoinSuccess={(id) => {
              setIsDuniyaActive(false);
              setActiveServerId(id);
            }} />
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
