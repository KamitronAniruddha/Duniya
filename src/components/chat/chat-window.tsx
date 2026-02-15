
"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, where, writeBatch, arrayUnion, deleteField } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Users, Loader2, MessageCircle, X, Trash2, CheckSquare, CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MembersPanel } from "@/components/members/members-panel";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ChatWindowProps {
  channelId: string | null;
  serverId: string | null;
  showMembers?: boolean;
  onToggleMembers?: () => void;
}

export function ChatWindow({ channelId, serverId, showMembers, onToggleMembers }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  // Selection Mode State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const channelRef = useMemoFirebase(() => (channelId && serverId && user ? doc(db, "communities", serverId, "channels", channelId) : null), [db, serverId, channelId, user?.uid]);
  const { data: channel } = useDoc(channelRef);

  const serverRef = useMemoFirebase(() => (serverId && user ? doc(db, "communities", serverId) : null), [db, serverId, user?.uid]);
  const { data: server } = useDoc(serverRef);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId || !user) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId, user?.uid]);

  const { data: members } = useCollection(membersQuery);

  const memberMap = useMemo(() => {
    if (!members) return {};
    return members.reduce((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {} as Record<string, any>);
  }, [members]);

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
    return rawMessages.filter(msg => !msg.fullyDeleted && !msg.deletedFor?.includes(user.uid));
  }, [rawMessages, user?.uid]);

  const handleSendMessage = async (text: string, audioUrl?: string, videoUrl?: string, replySenderName?: string, disappearing?: { enabled: boolean; duration: number }) => {
    if (!db || !channelId || !serverId || !user) return;
    
    const messageRef = doc(collection(db, "communities", serverId, "channels", channelId, "messages"));
    const sentAt = new Date();
    
    const data: any = {
      id: messageRef.id,
      channelId,
      senderId: user.uid,
      content: text,
      type: videoUrl ? "media" : (audioUrl ? "media" : "text"),
      sentAt: sentAt.toISOString(),
      ...(audioUrl && { audioUrl }),
      ...(videoUrl && { videoUrl }),
      disappearingEnabled: disappearing?.enabled || false,
      disappearDuration: disappearing?.duration || 0,
      fullyDeleted: false,
      seenBy: [],
      deletedFor: [],
      viewerExpireAt: {}
    };

    if (disappearing?.enabled) {
      const expireDate = new Date(sentAt.getTime() + disappearing.duration);
      data.senderExpireAt = expireDate.toISOString();
    }

    if (replyingTo && replySenderName) {
      data.replyTo = {
        messageId: replyingTo.id,
        senderName: replySenderName,
        text: replyingTo.content || (replyingTo.type === 'media' ? 'Media Message' : 'Message')
      };
    }

    setDocumentNonBlocking(messageRef, data, { merge: true });
    setReplyingTo(null);
  };

  const handleBatchDelete = async (type: "everyone" | "me") => {
    if (!db || !serverId || !channelId || !user || selectedIds.size === 0) return;
    
    const batch = writeBatch(db);
    const selectedMessages = rawMessages?.filter(m => selectedIds.has(m.id)) || [];
    
    selectedMessages.forEach(msg => {
      const msgRef = doc(db, "communities", serverId, "channels", channelId, "messages", msg.id);
      
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

    try {
      await batch.commit();
      toast({ title: `Deleted ${selectedIds.size} message(s)` });
      setSelectionMode(false);
      setSelectedIds(new Set());
      setIsDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: e.message });
    }
  };

  const canDeleteForEveryone = useMemo(() => {
    const selectedMessages = rawMessages?.filter(m => selectedIds.has(m.id)) || [];
    return selectedMessages.every(m => m.senderId === user?.uid);
  }, [selectedIds, rawMessages, user?.uid]);

  const toggleMessageSelection = useCallback((id: string) => {
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
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20);
  }, []);

  const handleJumpToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary/20');
      setTimeout(() => el.classList.remove('bg-primary/20'), 2000);
    }
  };

  useEffect(() => {
    if (scrollRef.current && !selectionMode) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectionMode]);

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
      <header className={cn(
        "h-14 border-b flex items-center justify-between px-4 shrink-0 transition-all z-20",
        selectionMode ? "bg-primary text-white shadow-lg" : "bg-background/80 backdrop-blur-md"
      )}>
        {selectionMode ? (
          <div className="flex items-center gap-4 w-full animate-in slide-in-from-top-4 duration-300">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}>
              <X className="h-5 w-5" />
            </Button>
            <span className="font-black text-lg flex-1 tracking-tight">{selectedIds.size} SELECTED</span>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-muted rounded-lg">
                <Hash className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-black text-sm truncate leading-none mb-0.5 tracking-tight">{channel?.name || "..."}</h2>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{server?.name || "Community"}</span>
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
          </>
        )}
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-muted/5 custom-scrollbar min-h-0">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest">Syncing the Verse</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-24 text-center opacity-30 animate-in fade-in duration-1000">
                <div className="p-6 bg-muted rounded-full w-fit mx-auto mb-6">
                  <Hash className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-black mb-1">WELCOME TO #{channel?.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest">The journey begins here.</p>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full">
                {messages.map((msg) => (
                  <div key={msg.id} ref={(el) => { messageRefs.current[msg.id] = el; }} className="transition-all duration-300">
                    <MessageBubble 
                      message={{
                        ...msg,
                        text: msg.content,
                        createdAt: msg.sentAt
                      }}
                      channelId={channelId!}
                      serverId={serverId!}
                      sender={memberMap[msg.senderId]}
                      isMe={msg.senderId === user?.uid}
                      isSelected={selectedIds.has(msg.id)}
                      selectionMode={selectionMode}
                      onLongPress={() => enterSelectionMode(msg.id)}
                      onSelect={() => toggleMessageSelection(msg.id)}
                      onReply={() => setReplyingTo(msg)}
                      onQuoteClick={() => handleJumpToMessage(msg.replyTo?.messageId)}
                    />
                  </div>
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
          <div className="hidden lg:block animate-in slide-in-from-right duration-300 border-l shadow-2xl z-10">
            <MembersPanel serverId={serverId} />
          </div>
        )}
      </div>
      
      {/* Selection Mode Actions */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">Delete {selectedIds.size} Messages?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              {canDeleteForEveryone 
                ? "Would you like to delete these for yourself or for everyone in the community?" 
                : "You can only delete these messages for yourself as some were sent by others."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-4">
            <AlertDialogCancel className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleBatchDelete("me")}
              className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] m-0 bg-muted text-foreground hover:bg-muted/80"
            >
              Delete for me
            </AlertDialogAction>
            {canDeleteForEveryone && (
              <AlertDialogAction 
                onClick={() => handleBatchDelete("everyone")}
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete for all
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="hidden md:flex justify-center py-1 bg-background border-t">
        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
          <span>Made by Aniruddha with love</span>
          <MessageCircle className="h-2 w-2 text-primary fill-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
}
