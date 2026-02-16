
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { DuniyaPanel } from "@/components/duniya/duniya-panel";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useUser, useFirestore, useMemoFirebase, useAuth, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, limit, where } from "firebase/firestore";
import { Loader2, Monitor, Tablet, Smartphone, Globe, MessageSquare, User, Compass, LayoutGrid, X, Shield, Settings, Heart } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Button } from "@/components/ui/button";
import { InvitationManager } from "@/components/invitations/invitation-manager";
import { cn } from "@/lib/utils";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DuniyaApp() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "duniya" | "admin">("chat");
  const [showMembers, setShowMembers] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCircularMenuOpen, setIsCircularMenuOpen] = useState(false);

  // Active Tab for Mobile/Tablet Modes
  const [activeTab, setActiveTab] = useState<"chat" | "explore" | "profile">("chat");

  const userRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);

  const mode = userData?.interfaceMode || "laptop";

  const serverRef = useMemoFirebase(() => (activeCommunityId ? doc(db, "communities", activeCommunityId) : null), [db, activeCommunityId]);
  const { data: server } = useDoc(serverRef);

  const isAdmin = useMemo(() => {
    if (!user || !server) return false;
    return server.ownerId === user.uid || server.admins?.includes(user.uid);
  }, [user?.uid, server]);

  // Fetch communities for circular switcher
  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "communities"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);
  const { data: communities } = useCollection(communitiesQuery);

  const channelsQuery = useMemoFirebase(() => {
    if (!db || !activeCommunityId || !user) return null;
    return query(collection(db, "communities", activeCommunityId, "channels"), limit(15));
  }, [db, activeCommunityId, user?.uid]);

  const { data: channels } = useCollection(channelsQuery);

  // AUTOMATIC CHANNEL ROUTING:
  // WhatsApp-Fast transition: Auto-select the first channel when entering a community.
  useEffect(() => {
    if (activeCommunityId && channels && channels.length > 0) {
      const firstChannelId = channels[0].id;
      if (!activeChannelId || !channels.some(c => c.id === activeChannelId)) {
        setActiveChannelId(firstChannelId);
      }
    }
  }, [activeCommunityId, channels, activeChannelId]);

  const lastSentStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !db || !auth.currentUser) return;

    const setPresence = (status: "online" | "idle" | "offline") => {
      const showStatus = userData?.showOnlineStatus !== false;
      const finalStatus = showStatus ? status : "offline";
      
      if (lastSentStatusRef.current !== finalStatus) {
        lastSentStatusRef.current = finalStatus;
        setDocumentNonBlocking(doc(db, "users", user.uid), {
          onlineStatus: finalStatus,
          lastOnlineAt: new Date().toISOString()
        }, { merge: true });
      }
    };

    setPresence(document.visibilityState === 'visible' ? "online" : "idle");

    const handleVisibility = () => setPresence(document.visibilityState === 'visible' ? "online" : "idle");
    const handleFocus = () => setPresence("online");
    const handleBlur = () => setPresence("idle");

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', () => setPresence("offline"));

    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') setPresence("online");
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
      setActiveChannelId(null); // Reset triggers the automatic routing useEffect
      setIsCircularMenuOpen(false);
    }
  }, []);

  if (isUserLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const renderLaptopLayout = () => (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="flex shrink-0 h-full overflow-hidden border-r border-border shadow-2xl z-30">
        <ServerSidebar 
          activeServerId={view === "chat" ? activeCommunityId : view} 
          isDuniyaActive={view === "duniya"}
          onSelectServer={handleSelectServer} 
        />
        {(view === "chat" || view === "admin") && (
          <div className="flex flex-col w-64 bg-card/50 backdrop-blur-xl">
            <ChannelSidebar 
              serverId={activeCommunityId} 
              activeChannelId={activeChannelId}
              onSelectChannel={setActiveChannelId}
            />
            {isAdmin && (
              <div className="p-4 mt-auto border-t">
                <Button 
                  variant={view === "admin" ? "default" : "outline"} 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest gap-2 shadow-lg transition-all"
                  onClick={() => setView(view === "admin" ? "chat" : "admin")}
                >
                  <Shield className="h-4 w-4" />
                  {view === "admin" ? "Exit Admin" : "Manage Verse"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-background">
        <AnimatePresence mode="wait">
          {view === "duniya" ? (
            <motion.div key="duniya" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 h-full">
              <DuniyaPanel onJoinSuccess={(id) => {
                setView("chat");
                setActiveCommunityId(id);
              }} />
            </motion.div>
          ) : view === "admin" ? (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 h-full">
              <AdminDashboard />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 h-full flex">
              <ChatWindow 
                channelId={activeChannelId}
                serverId={activeCommunityId}
                showMembers={showMembers}
                onToggleMembers={() => setShowMembers(!showMembers)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );

  const renderTabletLayout = () => (
    <div className="flex h-full w-full overflow-hidden bg-muted/5">
      <aside className="w-[72px] bg-sidebar border-r flex flex-col items-center py-6 gap-8 z-30 shrink-0 shadow-xl">
        <div className="p-3 bg-primary/10 rounded-2xl animate-float">
          <Logo size={24} />
        </div>
        
        <ServerSidebar 
          activeServerId={activeTab === "chat" ? activeCommunityId : null} 
          onSelectServer={(id) => {
            if (id === "duniya") setActiveTab("explore");
            else {
              setActiveTab("chat");
              handleSelectServer(id);
            }
          }} 
        />

        <nav className="flex flex-col gap-4 mt-4 border-t border-sidebar-border pt-6">
          <Button 
            variant={activeTab === "chat" ? "default" : "ghost"} 
            size="icon" 
            className="h-12 w-12 rounded-2xl shadow-inner"
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
            <Globe className="h-6 w-6" />
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
        <AnimatePresence mode="wait">
          {activeTab === "chat" ? (
            <motion.div key="tablet-chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full w-full">
              <div className="w-64 border-r bg-card/50 backdrop-blur-md shrink-0">
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
                  showMembers={showMembers}
                  onToggleMembers={() => setShowMembers(!showMembers)}
                />
              </div>
            </motion.div>
          ) : activeTab === "explore" ? (
            <motion.div key="tablet-explore" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 h-full">
              <DuniyaPanel onJoinSuccess={(id) => {
                setActiveTab("chat");
                handleSelectServer(id);
              }} />
            </motion.div>
          ) : (
            <div className="h-full w-full flex items-center justify-center p-8 text-center opacity-50">
              <div className="flex flex-col items-center gap-4">
                <User className="h-16 w-16" />
                <h2 className="text-xl font-bold">Profile View</h2>
                <Button onClick={() => setIsProfileOpen(true)}>Open Settings</Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );

  const renderMobileLayout = () => (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "chat" ? (
            <motion.div key="mobile-chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full w-full relative">
              {!activeCommunityId ? (
                <div className="flex-1 flex flex-col p-4">
                  <header className="py-6 flex items-center justify-between">
                    <div className="flex flex-col">
                      <h1 className="text-3xl font-black uppercase tracking-tighter text-primary leading-none">Verse</h1>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Duniya Messenger</span>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-muted/30" onClick={() => setIsProfileOpen(true)}>
                      <Avatar className="h-full w-full">
                        <AvatarImage src={userData?.photoURL} />
                        <AvatarFallback className="bg-primary text-white font-black">{userData?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </header>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                  
                  {/* Advanced Circular Community Switcher */}
                  <div className="absolute bottom-24 right-6 z-50">
                    <AnimatePresence>
                      {isCircularMenuOpen && communities && (
                        <div className="relative">
                          {communities.map((community, index) => {
                            const angle = (index * (360 / Math.min(communities.length, 8))) * (Math.PI / 180);
                            const radius = 85;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;

                            return (
                              <motion.button
                                key={community.id}
                                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                                animate={{ scale: 1, x: -x, y: -y, opacity: 1 }}
                                exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.05 }}
                                onClick={() => handleSelectServer(community.id)}
                                className={cn(
                                  "absolute h-14 w-14 rounded-full border-4 border-background shadow-2xl overflow-hidden transition-transform active:scale-90",
                                  activeCommunityId === community.id ? "ring-4 ring-primary" : "grayscale-[0.3]"
                                )}
                              >
                                <Avatar className="h-full w-full rounded-none">
                                  <AvatarImage src={community.icon} />
                                  <AvatarFallback className="bg-primary text-white font-black">{community.name?.[0]}</AvatarFallback>
                                </Avatar>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </AnimatePresence>

                    <Button
                      size="icon"
                      className={cn(
                        "h-16 w-16 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300",
                        isCircularMenuOpen ? "bg-destructive rotate-45" : "bg-primary"
                      )}
                      onClick={() => setIsCircularMenuOpen(!isCircularMenuOpen)}
                    >
                      {isCircularMenuOpen ? <X className="h-8 w-8" /> : <LayoutGrid className="h-8 w-8" />}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : activeTab === "explore" ? (
            <motion.div key="mobile-explore" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 h-full">
              <DuniyaPanel onJoinSuccess={(id) => {
                setActiveTab("chat");
                handleSelectServer(id);
              }} />
            </motion.div>
          ) : (
            <div className="h-full w-full flex items-center justify-center p-8 text-center opacity-50">
              <div className="flex flex-col items-center gap-4">
                <User className="h-16 w-16" />
                <h2 className="text-xl font-bold">Profile View</h2>
                <Button onClick={() => setIsProfileOpen(true)}>Open Settings</Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <nav className="h-16 border-t bg-background/80 backdrop-blur-md flex items-center justify-around shrink-0 z-[60]">
        <button 
          className={cn("flex flex-col items-center gap-1 p-2 transition-all flex-1", activeTab === "chat" ? "text-primary" : "text-muted-foreground opacity-60")}
          onClick={() => { setActiveTab("chat"); setIsCircularMenuOpen(false); }}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
        </button>
        <button 
          className={cn("flex flex-col items-center gap-1 p-2 transition-all flex-1", activeTab === "explore" ? "text-primary" : "text-muted-foreground opacity-60")}
          onClick={() => { setActiveTab("explore"); setIsCircularMenuOpen(false); }}
        >
          <Globe className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Duniya</span>
        </button>
        <button 
          className={cn("flex flex-col items-center gap-1 p-2 transition-all flex-1", activeTab === "profile" ? "text-primary" : "text-muted-foreground opacity-60")}
          onClick={() => { setActiveTab("profile"); setIsCircularMenuOpen(false); setIsProfileOpen(true); }}
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

function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20" />
        <path d="M2 12h20" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
          <Heart className="h-2 w-2 text-red-500 fill-red-500" />
        </motion.div>
      </div>
    </div>
  );
}
