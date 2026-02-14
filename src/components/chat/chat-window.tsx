"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, getDoc, Timestamp } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Phone, Video, Users, Loader2, MessageCircle, Timer, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DisappearingMessagesDialog } from "@/components/servers/disappearing-messages-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

interface ChatWindowProps {
  channelId: string | null;
  serverId: string | null;
  showMembers?: boolean;
  onToggleMembers?: () => void;
}

const DURATION_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export function ChatWindow({ channelId, serverId, showMembers, onToggleMembers }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [isDisappearingDialogOpen, setIsDisappearingDialogOpen] = useState(false);

  const channelRef = useMemoFirebase(() => (channelId && user ? doc(db, "channels", channelId) : null), [db, channelId, user?.uid]);
  const { data: channel } = useDoc(channelRef);

  const serverRef = useMemoFirebase(() => (serverId && user ? doc(db, "servers", serverId) : null), [db, serverId, user?.uid]);
  const { data: server } = useDoc(serverRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !channelId || !user) return null;
    return query(
      collection(db, "messages", channelId, "chatMessages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
  }, [db, channelId, user?.uid]);

  const { data: rawMessages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const isAdmin = useMemo(() => {
    if (!server || !user) return false;
    return server.ownerId === user.uid || server.admins?.includes(user.uid);
  }, [server, user]);

  const messages = useMemo(() => {
    if (!rawMessages || !user) return [];
    const now = Date.now();
    return rawMessages.filter(msg => {
      if (msg.deletedBy?.includes(user.uid)) return false;
      if (msg.expiresAt) {
        const expiryDate = msg.expiresAt.toDate ? msg.expiresAt.toDate() : new Date(msg.expiresAt);
        if (expiryDate.getTime() < now) return false;
      }
      return true;
    });
  }, [rawMessages, user?.uid]);

  const handleSendMessage = async (text: string, audioUrl?: string, videoUrl?: string) => {
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
        text: replyingTo.text ? (replyingTo.text.length > 100 ? replyingTo.text.substring(0, 100) + "..." : replyingTo.text) : (audioUrl ? "Voice Message" : (videoUrl ? "Video Message" : "Message"))
      };
    }

    let expiresAt = null;
    const duration = server?.disappearingMessagesDuration;
    if (duration && duration !== "off") {
      const ms = DURATION_MS[duration as keyof typeof DURATION_MS];
      if (ms) {
        expiresAt = Timestamp.fromDate(new Date(Date.now() + ms));
      }
    }

    setDocumentNonBlocking(messageRef, {
      id: messageRef.id,
      senderId: user.uid,
      text: (audioUrl || videoUrl) ? "" : text,
      type: videoUrl ? "video" : (audioUrl ? "voice" : "text"),
      audioUrl: audioUrl || null,
      videoUrl: videoUrl || null,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      edited: false,
      seenBy: [user.uid],
      isDeleted: false,
      deletedBy: [],
      ...(replyData && { replyTo: replyData })
    }, { merge: true });

    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => {
        element.classList.remove('bg-primary/20');
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
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6">
        <div className="text-center max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-primary/10 rounded-full mb-6 flex items-center justify-center shadow-inner">
            <MessageCircle className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-2 tracking-tighter text-foreground">
            Karo Chutiyapaa <Heart className="h-8 w-8 text-red-500 fill-red-500 animate-pulse" />
          </h2>
          <p className="text-muted-foreground text-sm mb-12 font-medium">
            Select a community from the left to start chatting, or explore the Duniya directory.
          </p>
          
          <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.3em]">
            <span>Made by Aniruddha with love</span>
            <Heart className="h-2.5 w-2.5 text-red-500 fill-red-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative min-w-0">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-muted rounded-lg">
            <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
          <h2 className="font-bold text-sm truncate text-foreground">{channel?.name || "..."}</h2>
          
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-7 px-2 gap-1.5 rounded-full text-[10px] font-bold uppercase transition-all",
                    server?.disappearingMessagesDuration && server.disappearingMessagesDuration !== "off"
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => isAdmin && setIsDisappearingDialogOpen(true)}
                  disabled={!isAdmin && (!server?.disappearingMessagesDuration || server.disappearingMessagesDuration === "off")}
                >
                  <Timer className={cn("h-3.5 w-3.5", server?.disappearingMessagesDuration !== "off" && "animate-pulse")} />
                  <span className="hidden xs:inline">
                    {server?.disappearingMessagesDuration && server.disappearingMessagesDuration !== "off" 
                      ? server.disappearingMessagesDuration 
                      : "Off"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {isAdmin ? "Click to change disappearing messages" : "Disappearing messages are " + (server?.disappearingMessagesDuration || "off")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex">
            <Video className="h-4 w-4 text-muted-foreground" />
          </Button>
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
        className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar bg-muted/10 min-h-0"
      >
        <div className="p-4 flex flex-col gap-1 min-h-full">
          <div className="flex-1" />
          
          {messagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="py-20 text-center space-y-4 opacity-50 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Hash className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Welcome to #{channel?.name}</h3>
                <p className="text-xs max-w-[200px] mx-auto text-muted-foreground">This is the very beginning of your community story. Send a message to get started!</p>
              </div>
            </div>
          ) : (
            messages?.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg}
                channelId={channelId!}
                isMe={msg.senderId === user?.uid}
                onReply={() => {
                  if (msg.isDeleted) return;
                  setReplyingTo(msg);
                  inputRef.current?.focus();
                }}
                onQuoteClick={scrollToMessage}
              />
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 bg-background border-t">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          inputRef={inputRef}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {serverId && (
        <DisappearingMessagesDialog 
          open={isDisappearingDialogOpen}
          onOpenChange={setIsDisappearingDialogOpen}
          serverId={serverId}
        />
      )}
    </div>
  );
}