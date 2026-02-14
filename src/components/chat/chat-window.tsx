
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
import { MembersPanel } from "@/components/members/members-panel";

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
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6 text-center animate-in fade-in duration-700">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <MessageCircle className="h-20 w-20 text-primary relative animate-bounce duration-[3000ms]" />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tighter text-foreground">Duniya Karo Chutiyapaa ❤️</h2>
        <p className="text-muted-foreground text-sm max-w-sm font-medium leading-relaxed">
          Select a community from the left to start your journey, or discover new ones in the directory.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-muted rounded-lg">
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-sm truncate leading-none mb-0.5">{channel?.name || "..."}</h2>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{server?.name || "Community"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9 rounded-xl transition-all", showMembers ? "bg-primary/10 text-primary shadow-inner" : "text-muted-foreground")} 
            onClick={onToggleMembers}
          >
            <Users className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/5 custom-scrollbar min-h-0">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">Loading Conversation</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-24 text-center opacity-30 animate-in fade-in duration-1000">
                <div className="p-6 bg-muted rounded-full w-fit mx-auto mb-6">
                  <Hash className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-black mb-1">Welcome to #{channel?.name}</h3>
                <p className="text-xs font-bold uppercase tracking-widest">This is the beginning of the channel history.</p>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full">
                {messages.map((msg) => (
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
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-background">
            <MessageInput 
              onSendMessage={handleSendMessage} 
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </div>
        </div>

        {showMembers && (
          <div className="hidden lg:block animate-in slide-in-from-right duration-300">
            <MembersPanel serverId={serverId} />
          </div>
        )}
      </div>
    </div>
  );
}
