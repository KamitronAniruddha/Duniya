
"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, arrayUnion, writeBatch, deleteField } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Hash, Users, Loader2, MessageCircle, X, Trash2, MoreVertical, Eraser, Forward, Settings, Heart } from "lucide-react";
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
import { ChannelSettingsDialog } from "@/components/channels/channel-settings-dialog";
import { AnimatePresence, motion } from "framer-motion";

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
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);

  const basePath = useMemo(() => {
    if (serverId && channelId) {
      return `communities/${serverId}/channels/${channelId}`;
    }
    return null;
  }, [serverId, channelId]);

  const contextRef = useMemoFirebase(() => (basePath ? doc(db, basePath) : null), [db, basePath]);
  const { data: contextData } = useDoc(contextRef);

  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "communities", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const isAdmin = useMemo(() => {
    if (!user || !server) return false;
    return server.ownerId === user.uid || server.admins?.includes(user.uid);
  }, [user?.uid, server]);

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
      senderName: user.displayName || "User",
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

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

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
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6 text-center overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-12">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="p-12 bg-primary/5 rounded-[3.5rem] relative z-10"
            >
              <MessageCircle className="h-24 w-24 text-primary" />
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
            />
          </div>
          
          <div className="space-y-6 max-w-lg">
            <h2 className="text-7xl font-[900] tracking-tighter uppercase text-foreground leading-none">DUNIYA</h2>
            <div className="flex flex-col items-center gap-4">
              <span className="font-['Playfair_Display'] italic text-5xl text-primary flex items-center gap-4 lowercase">
                Karo Chutiyapaa <Heart className="h-10 w-10 fill-red-500 text-red-500 animate-pulse" />
              </span>
              <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.5em] opacity-40 mt-6">
                Enter a community to begin your journey
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const headerTitle = contextData?.name || "...";
  const selectedMessagesCount = selectedIds.size;
  const allSelectedFromMe = rawMessages?.filter(m => selectedIds.has(m.id)).every(m => m.senderId === user?.uid) ?? false;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className={cn(
        "h-14 border-b flex items-center justify-between px-4 shrink-0 transition-all duration-150 z-20 overflow-hidden",
        selectionMode ? "bg-primary text-white" : "bg-background/80 backdrop-blur-md"
      )}>
        <AnimatePresence mode="wait">
          {selectionMode ? (
            <motion.div 
              key="selection-header"
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="flex items-center gap-4 w-full h-full"
            >
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={handleCancelSelection}>
                <X className="h-4 w-4" />
              </Button>
              <div className="flex-1 flex flex-col">
                <span className="font-black text-base tracking-tighter leading-none">{selectedMessagesCount} SELECTED</span>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Verse Operations</span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/10 rounded-full h-9 w-9" 
                  onClick={() => setIsForwardOpen(true)}
                >
                  <Forward className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-9 w-9" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="normal-header"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="flex items-center justify-between w-full h-full"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-primary/5 rounded-xl shrink-0">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-black text-xl truncate leading-none tracking-tighter text-foreground uppercase">#{headerTitle}</h2>
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1">Sync Active</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-9 w-9 rounded-xl transition-all duration-200", showMembers ? "bg-primary/10 text-primary" : "text-muted-foreground")} 
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
                  <DropdownMenuContent align="end" className="w-56 font-black uppercase text-[10px] tracking-widest p-1 border-none shadow-2xl bg-popover/95 backdrop-blur-md">
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => setIsChannelSettingsOpen(true)} className="gap-2 p-3 rounded-xl">
                        <Settings className="h-4 w-4 text-primary" /> Edit Channel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setIsClearChatDialogOpen(true)} className="gap-2 text-destructive p-3 rounded-xl">
                      <Eraser className="h-4 w-4" /> Wipe Messages
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar min-h-0">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-primary">Syncing Verse</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-24 text-center opacity-30 flex flex-col items-center">
                <div className="h-20 w-20 bg-muted/50 rounded-[2.5rem] flex items-center justify-center mb-6">
                  <Hash className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-black mb-1 tracking-tighter uppercase text-foreground">WELCOME TO #{headerTitle}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Start something legendary.</p>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full">
                <AnimatePresence mode="popLayout" initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ 
                        opacity: 0, 
                        transition: { duration: 0.1, ease: "easeOut" } 
                      }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                    >
                      <MessageBubble 
                        message={msg}
                        messagePath={`${basePath}/messages/${msg.id}`}
                        isMe={msg.senderId === user?.uid}
                        isSelected={selectedIds.has(msg.id)}
                        selectionMode={selectionMode}
                        onLongPress={enterSelectionMode}
                        onSelect={toggleMessageSelection}
                        onReply={() => setReplyingTo(msg)}
                      />
                    </motion.div>
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
          <div className="hidden lg:block border-l z-10 bg-background overflow-hidden">
            <MembersPanel serverId={serverId} />
          </div>
        )}
      </div>
      
      <DeleteOptionsDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(val) => {
          setIsDeleteDialogOpen(val);
          if (!val) {
            handleCancelSelection();
          }
        }} 
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
            handleCancelSelection();
          }
        }} 
        messagesToForward={rawMessages?.filter(m => selectedIds.has(m.id)) || []}
        currentCommunityName={server?.name}
        currentChannelName={contextData?.name}
      />

      {serverId && channelId && (
        <ChannelSettingsDialog 
          open={isChannelSettingsOpen} 
          onOpenChange={setIsChannelSettingsOpen} 
          serverId={serverId}
          channelId={channelId}
        />
      )}

      <AlertDialog open={isClearChatDialogOpen} onOpenChange={setIsClearChatDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase">CLEAR CHAT?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              This will remove all messages from your view. This operation is synchronized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-2xl font-bold h-12 flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="rounded-2xl font-black h-12 flex-1 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 uppercase tracking-widest">Wipe Verse</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
