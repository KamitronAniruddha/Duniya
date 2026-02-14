"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Users, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

interface ChatWindowProps {
  channelId: string | null;
  serverId: string | null;
  showMembers?: boolean;
  onToggleMembers?: () => void;
}

export function ChatWindow({ channelId, serverId, showMembers, onToggleMembers }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  const channelRef = useMemoFirebase(() => (channelId && serverId && user ? doc(db, "communities", serverId, "channels", channelId) : null), [db, serverId, channelId, user?.uid]);
  const { data: channel } = useDoc(channelRef);

  const serverRef = useMemoFirebase(() => (serverId && user ? doc(db, "communities", serverId) : null), [db, serverId, user?.uid]);
  const { data: server } = useDoc(serverRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !channelId || !serverId || !user) return null;
    return query(
      collection(db, "communities", serverId, "channels", channelId, "messages"),
      orderBy("sentAt", "asc"),
      limit(100)
    );
  }, [db, serverId, channelId, user?.uid]);

  const { data: rawMessages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages || !user) return [];
    return rawMessages.filter(msg => !msg.deletedAt);
  }, [rawMessages, user?.uid]);

  const handleSendMessage = async (text: string, audioUrl?: string, videoUrl?: string) => {
    if (!db || !channelId || !serverId || !user) return;
    
    const messageRef = doc(collection(db, "communities", serverId, "channels", channelId, "messages"));
    
    const data = {
      id: messageRef.id,
      channelId,
      senderId: user.uid,
      content: text,
      type: videoUrl ? "media" : (audioUrl ? "media" : "text"),
      sentAt: new Date().toISOString(),
      ...(audioUrl && { audioUrl }),
      ...(videoUrl && { videoUrl })
    };

    setDocumentNonBlocking(messageRef, data, { merge: true });
    setReplyingTo(null);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!serverId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6 text-center">
        <MessageCircle className="h-12 w-12 text-primary mb-6" />
        <h2 className="text-3xl font-black mb-2 tracking-tighter">Karo Chutiyapaa ❤️</h2>
        <p className="text-muted-foreground text-sm max-w-sm">Select a community to start chatting, or explore the Duniya directory.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-bold text-sm truncate">{channel?.name || "..."}</h2>
        </div>
        
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleMembers}>
            <Users className={cn("h-4 w-4", showMembers && "text-primary")} />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/5 custom-scrollbar min-h-0">
        {messagesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center opacity-50">
            <Hash className="h-10 w-10 mx-auto mb-4" />
            <p className="text-sm">This is the beginning of #{channel?.name}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={{
                ...msg,
                text: msg.content,
                createdAt: msg.sentAt
              }}
              channelId={channelId!}
              serverId={serverId!}
              isMe={msg.senderId === user?.uid}
              onReply={() => setReplyingTo(msg)}
            />
          ))
        )}
      </div>

      <div className="shrink-0">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
}