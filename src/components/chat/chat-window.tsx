
"use client";

import { useRef, useEffect } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Phone, Video, Users, MoreHorizontal, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  channelId: string | null;
  serverId: string | null;
}

export function ChatWindow({ channelId, serverId }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
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
    }).catch((error) => {
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: error.message || "Something went wrong",
      });
    });
  };

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  if (!serverId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-primary/10 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-inner">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Create your first server</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            ConnectVerse is better with friends. Join an existing server or start your own community!
          </p>
        </div>
      </div>
    );
  }

  if (!channelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 h-full p-6">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium italic">Selecting best channel for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
      <header className="h-14 px-6 border-b flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2 overflow-hidden">
          <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="font-bold text-sm truncate">{channel?.name || "Loading..."}</h2>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-gray-100">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-gray-100">
            <Video className="h-4 w-4" />
          </Button>
          <div className="hidden md:flex h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-gray-100">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-gray-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 h-full">
        <div className="py-6 px-6 max-w-6xl mx-auto">
          {messagesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading message history...</p>
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 grayscale">
              <Hash className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-bold">Welcome to #{channel?.name}</h3>
              <p>This is the start of this channel. Say hi!</p>
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
