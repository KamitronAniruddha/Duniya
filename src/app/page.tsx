
"use client";

import { useState } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AuthScreen } from "@/components/auth/auth-screen";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function ConnectVerseApp() {
  const { user, isUserLoading } = useUser();
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  if (isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
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
