
"use client";

import { useRef, useEffect } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { Hash, Phone, Video, Search, Pin, Users, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatWindowProps {
  channelId: string | null;
  serverId: string | null;
}

export function ChatWindow({ channelId, serverId }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelRef = useMemoFirebase(() => (channelId ? doc(db, "channels", channelId) : null), [db, channelId]);
  const { data: channel } = useDoc(channelRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !channelId) return null;
    return query(
      collection(db, "messages", channelId, "chatMessages"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
  }, [db, channelId]);

  const { data: messages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const handleSendMessage = (text: string) => {
    if (!db || !channelId || !user) return;
    
    const messageId = Math.random().toString(36).substr(2, 9);
    const messageRef = doc(db, "messages", channelId, "chatMessages", messageId);
    
    setDoc(messageRef, {
      id: messageId,
      senderId: user.uid,
      text,
      createdAt: serverTimestamp(),
      edited: false,
      seenBy: [user.uid]
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  if (!channelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center p-12 max-w-md">
          <div className="w-20 h-20 bg-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <Hash className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to ConnectVerse</h2>
          <p className="text-muted-foreground">Choose a channel from the left to start chatting with your community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      <header className="h-14 px-6 border-b flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2 overflow-hidden">
          <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="font-bold text-sm truncate">{channel?.name || "Loading..."}</h2>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Video className="h-4 w-4" />
          </Button>
          <div className="hidden md:flex h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-6">
        <div ref={scrollRef} className="py-6 max-w-6xl mx-auto">
          {messagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-1">
              {messages?.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isMe={msg.senderId === user?.uid} 
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}
