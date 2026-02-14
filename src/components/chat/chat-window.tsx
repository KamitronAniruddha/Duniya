
"use client";

import { useRef, useEffect, useState } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Phone, Video, Users, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  const channelRef = useMemoFirebase(() => (channelId && user ? doc(db, "channels", channelId) : null), [db, channelId, user?.uid]);
  const { data: channel } = useDoc(channelRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !channelId || !user) return null;
    return query(
      collection(db, "messages", channelId, "chatMessages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
  }, [db, channelId, user?.uid]);

  const { data: messages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const handleSendMessage = async (text: string, audioUrl?: string) => {
    if (!db || !channelId || !user) return;
    
    const messageRef = doc(collection(db, "messages", channelId, "chatMessages"));
    
    let replyData = null;
    if (replyingTo) {
      const senderRef = doc(db, "users", replyingTo.senderId);
      const senderSnap = await getDoc(senderRef);
      const senderName = senderSnap.exists() ? senderSnap.data().username : "Someone";

      replyData = {
        messageId: replyingTo.id,
        senderName: senderName,
        text: replyingTo.text ? (replyingTo.text.length > 100 ? replyingTo.text.substring(0, 100) + "..." : replyingTo.text) : "Voice Message"
      };
    }

    setDocumentNonBlocking(messageRef, {
      id: messageRef.id,
      senderId: user.uid,
      text: audioUrl ? "" : text,
      type: audioUrl ? "voice" : "text",
      audioUrl: audioUrl || null,
      createdAt: serverTimestamp(),
      edited: false,
      seenBy: [user.uid],
      ...(replyData && { replyTo: replyData })
    }, { merge: true });

    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/10');
      setTimeout(() => {
        element.classList.remove('bg-primary/10');
      }, 2000);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages]);

  if (!serverId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 h-full p-6">
        <div className="text-center max-w-sm">
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
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative min-w-0">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-white z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="font-bold text-sm truncate">{channel?.name || "..."}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex">
            <Video className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="hidden sm:block w-px h-4 bg-border mx-1" />
          <Button 
            variant={showMembers ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8"
            onClick={onToggleMembers}
          >
            <Users className={cn("h-4 w-4", showMembers ? "text-primary" : "text-muted-foreground")} />
          </Button>
        </div>
      </header>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar bg-gray-50/30 min-h-0"
      >
        <div className="p-4 flex flex-col gap-1 min-h-full">
          <div className="flex-1" />
          
          {messagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="py-20 text-center space-y-2 opacity-50">
              <Hash className="h-12 w-12 mx-auto text-primary" />
              <h3 className="font-bold">Welcome to #{channel?.name}</h3>
              <p className="text-xs">This is the start of your community story.</p>
            </div>
          ) : (
            messages?.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isMe={msg.senderId === user?.uid}
                onReply={() => {
                  setReplyingTo(msg);
                  inputRef.current?.focus();
                }}
                onQuoteClick={scrollToMessage}
              />
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 bg-white border-t">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          inputRef={inputRef}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
}
