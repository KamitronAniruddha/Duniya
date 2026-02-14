
"use client";

import { useRef, useEffect } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Phone, Video, Users, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
    
    // Pre-generate ID for non-blocking set
    const messageRef = doc(collection(db, "messages", channelId, "chatMessages"));
    
    setDocumentNonBlocking(messageRef, {
      id: messageRef.id,
      senderId: user.uid,
      text,
      createdAt: serverTimestamp(),
      edited: false,
      seenBy: [user.uid]
    }, { merge: true });
  };

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messagesLoading]);

  if (!serverId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 h-full">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connect to the Verse</h2>
          <p className="text-muted-foreground text-sm">
            Select a server from the left to start chatting, or create your own community.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="font-bold text-sm truncate">{channel?.name || "..."}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4 text-muted-foreground" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4 text-muted-foreground" /></Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8"><Users className="h-4 w-4 text-muted-foreground" /></Button>
        </div>
      </header>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar bg-gray-50/50"
      >
        <div className="p-4 flex flex-col gap-1 min-h-full">
          <div className="flex-1" />
          
          {messagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="py-20 text-center space-y-2 opacity-50">
              <Hash className="h-12 w-12 mx-auto" />
              <h3 className="font-bold">Welcome to #{channel?.name}</h3>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            messages?.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isMe={msg.senderId === user?.uid} 
              />
            ))
          )}
        </div>
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}
