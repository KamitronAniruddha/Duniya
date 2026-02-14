"use client";

import { useState } from "react";
import { ServerSidebar } from "@/components/sidebar/server-sidebar";
import { ChannelSidebar } from "@/components/sidebar/channel-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { AISuggestionPanel } from "@/components/ai/ai-suggestion-panel";
import { MOCK_SERVERS, CURRENT_USER, MOCK_MESSAGES, Message } from "@/lib/mock-data";

export default function ConnectVerseApp() {
  const [activeServer] = useState(MOCK_SERVERS[0]);
  const [activeChannel] = useState(activeServer.channels[0]);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* 1st Column: Discord-style Server Sidebar */}
      <ServerSidebar />

      {/* 2nd Column: Channel/Direct Messages List */}
      <ChannelSidebar server={activeServer} currentUser={CURRENT_USER} />

      {/* 3rd Column: Main Chat Window */}
      <ChatWindow 
        channel={activeChannel} 
        currentUser={CURRENT_USER} 
        onUpdateMessages={(newMsgs) => setMessages(newMsgs)} 
      />

      {/* 4th Column: Contextual AI Suggestions (GenAI) */}
      <AISuggestionPanel messages={messages} />
    </div>
  );
}