
"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, arrayUnion, writeBatch, deleteField } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Users, Loader2, MessageCircle, X, Trash2, MoreVertical, Eraser, Forward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MembersPanel } from "@/components/members/members-panel";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteOptionsDialog } from "./delete-options-dialog";
import { ForwardDialog } from "./forward-dialog";
import { AnimatePresence } from "framer-motion";

interface ChatWindowProps {
  channelId?: string | null;
  serverId?: string | null;
  showMembers?: boolean;
  onToggleMembers?: () => void;
}

export function ChatWindow({ channelId, serverId, showMembers, onToggleMembers }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);

  const basePath = useMemo(() => {
    if (serverId && channelId) {
      return `communities/${serverId}/channels/${channelId}`;
    }
    return null;
  }, [serverId, channelId]);

  const contextRef = useMemoFirebase(() => (basePath ? doc(db, basePath) : null), [db, basePath]);
  const { data: contextData } = useDoc(contextRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !basePath || !user) return null;
    return query(
      collection(db, basePath, "messages"),
      orderBy("sentAt", "asc"),
      limit(100)
    );
  }, [db, basePath, user?.uid]);

  const { data: rawMessages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages || !user) return [];
    return rawMessages.filter(msg => !msg.fullyDeleted && !msg.deletedFor?.includes(user.uid));
  }, [rawMessages, user?.uid]);

  const handleSendMessage = useCallback(async (text: string, audioUrl?: string, videoUrl?: string, replySenderName?: string, disappearing?: { enabled: boolean; duration: number }) => {
    if (!db || !basePath || !user) return;
    
    const messageRef = doc(collection(db, basePath, "messages"));
    const sentAt = new Date();
    
    const data: any = {
      id: messageRef.id,
      channelId: channelId,
      senderId: user.uid,
      content: text,
      type: videoUrl ? "media" : (audioUrl ? "media" : "text"),
      sentAt: sentAt.toISOString(),
      audioUrl: audioUrl || null,
      videoUrl: videoUrl || null,
      disappearingEnabled: disappearing?.enabled || false,
      disappearDuration: disappearing?.duration || 0,
      fullyDeleted: false,
      seenBy: [],
      deletedFor: [],
      viewerExpireAt: {}
    };

    if (disappearing?.enabled) {
      data.senderExpireAt = new Date(sentAt.getTime() + disappearing.duration).toISOString();
    }

    if (replyingTo && replySenderName) {
      data.replyTo = {
        messageId: replyingTo.id,
        senderName: replySenderName,
        text: replyingTo.content || 'Media Message'
      };
    }

    setDocumentNonBlocking(messageRef, data, { merge: true });
    setReplyingTo(null);
  }, [db, basePath, user, replyingTo, channelId]);

  const handleBatchDelete = useCallback(async (type: "everyone" | "me") => {
    if (!db || !basePath || !user || selectedIds.size === 0) return;
    
    const batch = writeBatch(db);
    const selectedMessages = rawMessages?.filter(m => selectedIds.has(m.id)) || [];
    
    selectedMessages.forEach(msg => {
      const msgRef = doc(db, basePath, "messages", msg.id);
      if (type === "everyone" && msg.senderId === user.uid) {
        batch.update(msgRef, {
          isDeleted: true,
          content: "This message was deleted",
          audioUrl: deleteField(),
          videoUrl: deleteField(),
          type: "text"
        });
      } else {
        batch.update(msgRef, {
          deletedFor: arrayUnion(user.uid)
        });
      }
    });

    await batch.commit();
    toast({ title: `Removed ${selectedIds.size} message(s)` });
    setSelectionMode(false);
    setSelectedIds(new Set());
    setIsDeleteDialogOpen(false);
  }, [db, basePath, user, selectedIds, rawMessages, toast]);

  const handleClearChat = useCallback(async () => {
    if (!db || !basePath || !user || !messages.length) return;
    
    const batch = writeBatch(db);
    messages.forEach(msg => {
      const msgRef = doc(db, basePath, "messages", msg.id);
      batch.update(msgRef, {
        deletedFor: arrayUnion(user.uid)
      });
    });

    await batch.commit();
    toast({ title: "Chat Cleared" });
    setIsClearChatDialogOpen(false);
  }, [db, basePath, user, messages, toast]);

  const toggleMessageSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setSelectionMode(false);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterSelectionMode = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  useEffect(() => {
    if (scrollRef.current && !selectionMode) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, selectionMode]);

  if (!basePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6 text-center">
        <MessageCircle className="h-16 w-16 text-primary/20 mb-4" />
        <h2 className="text-2xl font-black mb-2 tracking-tight">Duniya Verse Chat</h2>
        <p className="text-muted-foreground text-xs max-w-xs font-medium uppercase tracking-widest">
          Select a community channel to start messaging.
        </p>
      </div>
    );
  }

  const headerTitle = contextData?.name || "...";
  const selectedMessages = rawMessages?.filter(m => selectedIds.has(m.id)) || [];
  const allSelectedFromMe = selectedMessages.every(m => m.senderId === user?.uid);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className={cn(
        "h-14 border-b flex items-center justify-between px-4 shrink-0 transition-all z-20",
        selectionMode ? "bg-primary text-white" : "bg-background/80 backdrop-blur-md"
      )}>
        {selectionMode ? (
          <div className="flex items-center gap-4 w-full">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}>
              <X className="h-5 w-5" />
            </Button>
            <span className="font-black text-lg flex-1 tracking-tight">{selectedIds.size} SELECTED</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsForwardOpen(true)}>
                <Forward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <h2 className="font-black text-sm truncate leading-none mb-0.5 tracking-tight">#{headerTitle}</h2>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Channel</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-9 w-9 rounded-xl", showMembers ? "bg-primary/10 text-primary" : "text-muted-foreground")} 
                onClick={onToggleMembers}
              >
                <Users className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 font-bold uppercase text-[10px] tracking-widest">
                  <DropdownMenuItem onClick={() => setIsClearChatDialogOpen(true)} className="gap-2 text-destructive">
                    <Eraser className="h-4 w-4" /> Clear Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar min-h-0">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">Syncing Chat</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-24 text-center opacity-30">
                <Hash className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-black mb-1">WELCOME TO #{headerTitle}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest">No messages yet.</p>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <MessageBubble 
                      key={msg.id}
                      message={msg}
                      messagePath={`${basePath}/messages/${msg.id}`}
                      isMe={msg.senderId === user?.uid}
                      isSelected={selectedIds.has(msg.id)}
                      selectionMode={selectionMode}
                      onLongPress={enterSelectionMode}
                      onSelect={toggleMessageSelection}
                      onReply={() => setReplyingTo(msg)}
                    />
                  ))}
                </AnimatePresence>
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

        {showMembers && serverId && (
          <div className="hidden lg:block border-l z-10 bg-background">
            <MembersPanel serverId={serverId} />
          </div>
        )}
      </div>
      
      <DeleteOptionsDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onDeleteForMe={() => handleBatchDelete("me")} 
        onDeleteForEveryone={allSelectedFromMe ? () => handleBatchDelete("everyone") : undefined} 
        isSender={allSelectedFromMe}
        count={selectedIds.size}
      />

      <ForwardDialog 
        open={isForwardOpen} 
        onOpenChange={(val) => {
          setIsForwardOpen(val);
          if (!val) {
            setSelectionMode(false);
            setSelectedIds(new Set());
          }
        }} 
        messagesToForward={selectedMessages}
        currentCommunityName={contextData?.name}
      />

      <AlertDialog open={isClearChatDialogOpen} onOpenChange={setIsClearChatDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Chat?</AlertDialogTitle>
            <AlertDialogDescription>This will hide all current messages from your view.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat}>Clear Everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
