
"use client";

import { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function ConnectVerseApp() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Auto-select first channel when server changes
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

  // Handle Online Status
  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, "users", user.uid);
    
    const updateStatus = (status: "online" | "idle" | "offline") => {
      updateDoc(userRef, {
        onlineStatus: status,
        lastSeen: serverTimestamp()
      }).catch(() => {}); // Fail silently for background updates
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
      updateStatus("offline");
    };
  }, [user, db]);

  if (isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Establishing secure connection...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground antialiased selection:bg-primary/20">
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

      <ChatWindow 
        channelId={activeChannelId}
        serverId={activeServerId}
      />
    </div>
  );
}
