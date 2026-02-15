
"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, where, writeBatch, arrayUnion, deleteField } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Users, Loader2, MessageCircle, X, Trash2, MoreVertical, Eraser, Forward, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MembersPanel } from "@/components/members/members-panel";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ForwardDialog } from "./forward-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);

  // Path resolution logic
  const basePath = useMemo(() => {
    if (serverId && channelId) {
      return `communities/${serverId}/channels/${channelId}`;
    }
    return null;
  }, [serverId, channelId]);

  // Document references
  const contextRef = useMemoFirebase(() => (basePath ? doc(db, basePath) : null), [db, basePath]);
  const { data: contextData } = useDoc(contextRef);

  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "communities", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  // Message querying
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

  // Member lookup
  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId]);
  const { data: members } = useCollection(membersQuery);

  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (members) members.forEach(m => map[m.id] = m);
    if (user) map[user.uid] = user;
    return map;
  }, [members, user]);

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
        text: replyingTo.content || (replyingTo.type === 'media' ? 'Media Message' : 'Message')
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
      if (type === "everyone" && msg.senderId === user.uid && !msg.isDeleted) {
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
      toast({ title: `Removed ${selectedIds.size} message(s)` });
      setSelectionMode(false);
      setSelectedIds(new Set());
      setIsDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Failed", description: e.message });
    }
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

    try {
      await batch.commit();
      toast({ title: "Chat Cleared" });
      setIsClearChatDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Clear Failed", description: e.message });
    }
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
  }, [messages.length, selectionMode]);

  if (!basePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6 text-center">
        <MessageCircle className="h-16 w-16 text-primary/20 mb-4" />
        <h2 className="text-2xl font-black mb-2 tracking-tight">Duniya Verse Chat</h2>
        <p className="text-muted-foreground text-xs max-w-xs font-medium uppercase tracking-widest">
          Select a community to start messaging.
        </p>
      </div>
    );
  }

  const headerTitle = contextData?.name || "...";

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
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10" 
                onClick={() => setIsForwardDialogOpen(true)}
              >
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
                className={cn("h-9 w-9 rounded-xl transition-all", showMembers ? "bg-primary/10 text-primary" : "text-muted-foreground")} 
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-muted/5 custom-scrollbar min-h-0">
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
                {messages.map((msg) => (
                  <div key={msg.id} ref={(el) => { messageRefs.current[msg.id] = el; }}>
                    <MessageBubble 
                      message={msg}
                      messagePath={`${basePath}/messages/${msg.id}`}
                      sender={memberMap[msg.senderId]}
                      isMe={msg.senderId === user?.uid}
                      isSelected={selectedIds.has(msg.id)}
                      selectionMode={selectionMode}
                      onLongPress={enterSelectionMode}
                      onSelect={toggleMessageSelection}
                      onReply={() => setReplyingTo(msg)}
                      onQuoteClick={handleJumpToMessage}
                      onForward={() => {
                        setSelectedIds(new Set([msg.id]));
                        setIsForwardDialogOpen(true);
                      }}
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
          <div className="hidden lg:block animate-in slide-in-from-right duration-300 border-l z-10 bg-background">
            <MembersPanel serverId={serverId!} />
          </div>
        )}
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-[400px]">
          <div className="bg-destructive/10 p-8 text-center">
            <Trash2 className="h-12 w-12 text-destructive mx-auto mb-4" />
            <AlertDialogTitle className="text-2xl font-black tracking-tight mb-2">Delete {selectedIds.size} Messages?</AlertDialogTitle>
            <AlertDialogDescription>This action will remove the selected messages from your view.</AlertDialogDescription>
          </div>
          <div className="p-6 bg-background flex flex-col gap-2">
            <AlertDialogAction onClick={() => handleBatchDelete("me")} className="w-full h-12 rounded-xl font-black bg-destructive text-white">
              Delete for Me
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleBatchDelete("everyone")} className="w-full h-12 rounded-xl font-black bg-destructive text-white">
              Delete for Everyone
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-xl font-bold border-none" onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}>
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearChatDialogOpen} onOpenChange={setIsClearChatDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-[400px]">
          <div className="p-8 text-center bg-muted/30">
            <Eraser className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <AlertDialogTitle className="text-2xl font-black tracking-tight mb-2">Clear Chat?</AlertDialogTitle>
            <AlertDialogDescription>All messages in this channel will be hidden for you.</AlertDialogDescription>
          </div>
          <div className="p-6 bg-background flex flex-col gap-2">
            <AlertDialogAction onClick={handleClearChat} className="w-full h-12 rounded-xl font-black">
              Yes, Clear Everything
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-xl font-bold border-none">Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <ForwardDialog 
        open={isForwardDialogOpen} 
        onOpenChange={(open) => {
          setIsForwardDialogOpen(open);
          if (!open) {
            setSelectionMode(false);
            setSelectedIds(new Set());
          }
        }} 
        messagesToForward={rawMessages?.filter(m => selectedIds.has(m.id)) || []}
        currentCommunityName={server?.name}
        memberMap={memberMap}
      />
    </div>
  );
}
