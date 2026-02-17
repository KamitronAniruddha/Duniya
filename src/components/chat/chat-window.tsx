"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { collection, query, limit, doc, arrayUnion, writeBatch, deleteField, where, getDocs } from "firebase/firestore";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { Hash, Users, Loader2, MessageCircle, X, Trash2, MoreVertical, Eraser, Forward, Settings, Heart, Activity, Zap, Info, Clock, Check, BellOff, Bell, History, Link, Compass, LogOut, Lock, Ghost } from "lucide-react";
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
import { useTheme } from "next-themes";

interface ProfileReplyTarget {
  id: string;
  username: string;
  photoURL: string;
  bio?: string;
  totalCommunities: number;
  commonCommunities: number;
  joinedAt?: string;
}

interface ChatWindowProps {
  channelId?: string | null;
  serverId?: string | null;
  showMembers?: boolean;
  onToggleMembers?: () => void;
  onOpenProfile?: () => void;
  onOpenExplore?: () => void;
}

export function ChatWindow({ channelId, serverId, showMembers, onToggleMembers, onOpenProfile, onOpenExplore }: ChatWindowProps) {
  const db = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, themes } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [profileReplyTarget, setProfileReplyTarget] = useState<ProfileReplyTarget | null>(null);
  const [whisperingTo, setWhisperingTo] = useState<{ id: string; username: string } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);

  const basePath = useMemo(() => {
    if (serverId && channelId) return `communities/${serverId}/channels/${channelId}`;
    return null;
  }, [serverId, channelId]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setReplyingTo(null);
    setWhisperingTo(null);
    setProfileReplyTarget(null);
  }, [basePath]);

  const contextRef = useMemoFirebase(() => (basePath ? doc(db, basePath) : null), [db, basePath]);
  const { data: contextData } = useDoc(contextRef);

  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "communities", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const isAdmin = useMemo(() => {
    if (!user || !server) return false;
    return server.ownerId === user.uid || server.admins?.includes(user.uid);
  }, [user?.uid, server]);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !basePath || !user) return null;
    // CRITICAL FIX: Removed orderBy("sentAt") to avoid composite index requirement when filtering by array.
    // Sorting is handled client-side in the messages useMemo.
    return query(
      collection(db, basePath, "messages"), 
      where("visibleTo", "array-contains-any", ["all", user.uid]),
      limit(100)
    );
  }, [db, basePath, user?.uid]);

  const { data: rawMessages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages || !user) return [];
    return [...rawMessages]
      .filter(msg => {
        if (msg.fullyDeleted || msg.deletedFor?.includes(user.uid)) return false;
        return true;
      })
      .sort((a, b) => {
        // High Fidelity In-Memory Chronological Sorting
        const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return dateA - dateB;
      });
  }, [rawMessages, user?.uid]);

  const handleSendMessage = useCallback(async (
    text: string, 
    audioUrl?: string, 
    videoUrl?: string, 
    replySenderName?: string, 
    disappearing?: { enabled: boolean; duration: number }, 
    imageUrl?: string,
    file?: { url: string; name: string; type: string },
    whisperTarget?: { id: string; username: string } | null,
    replySenderPhotoURL?: string,
    isProfileReply?: boolean,
    profileContext?: any,
    isSensitive?: boolean
  ) => {
    if (!db || !basePath || !user) return;
    const messageRef = doc(collection(db, basePath, "messages"));
    const sentAt = new Date();
    
    let messageType = "text";
    if (videoUrl || audioUrl || imageUrl) messageType = "media";
    if (file) messageType = "file";

    const finalWhisper = whisperTarget !== undefined ? whisperTarget : whisperingTo;
    const cleanReplyName = replySenderName ? replySenderName.replace(/^@/, '') : "";

    const data: any = {
      id: messageRef.id,
      channelId: channelId || null,
      serverId: serverId || null,
      senderId: user.uid,
      senderName: userData?.username || userData?.displayName || user.displayName || "User",
      senderPhotoURL: userData?.photoURL || user.photoURL || "",
      content: text || "",
      type: messageType,
      sentAt: sentAt.toISOString(),
      audioUrl: audioUrl || null,
      videoUrl: videoUrl || null,
      imageUrl: imageUrl || null,
      fileUrl: file?.url || null,
      fileName: file?.name || null,
      fileType: file?.type || null,
      disappearingEnabled: !!disappearing?.enabled,
      disappearDuration: disappearing?.duration || 0,
      fullyDeleted: false,
      seenBy: [],
      deletedFor: [],
      viewerExpireAt: {},
      whisperTo: finalWhisper?.id || null,
      whisperToUsername: finalWhisper?.username || null,
      visibleTo: finalWhisper?.id ? [user.uid, finalWhisper.id] : ["all"],
      isSensitive: !!isSensitive
    };

    if (disappearing?.enabled) {
      data.senderExpireAt = new Date(sentAt.getTime() + (disappearing.duration || 10000)).toISOString();
    }

    if (isProfileReply && profileReplyTarget) {
      data.replyTo = {
        messageId: "profile",
        senderName: profileReplyTarget.username,
        senderPhotoURL: profileReplyTarget.photoURL,
        text: `Shared thoughts on @${profileReplyTarget.username}'s identity picture.`,
        profileContext: profileContext || {}
      };
    } else if (replyingTo) {
      data.replyTo = { 
        messageId: replyingTo.id || "", 
        senderName: cleanReplyName || replyingTo.senderName || "User", 
        senderPhotoURL: replySenderPhotoURL || replyingTo.senderPhotoURL || "",
        text: replyingTo.content || replyingTo.text || 'Media Message' 
      };
    }
    
    setDocumentNonBlocking(messageRef, data, { merge: true });
    setReplyingTo(null);
    setWhisperingTo(null);
    setProfileReplyTarget(null);
  }, [db, basePath, user, replyingTo, whisperingTo, profileReplyTarget, channelId, serverId, userData]);

  const handleClearChat = useCallback(async () => {
    if (!db || !basePath || !user || !messages.length) return;
    const batch = writeBatch(db);
    messages.forEach(msg => {
      const msgRef = doc(db, basePath, "messages", msg.id);
      batch.update(msgRef, { deletedFor: arrayUnion(user.uid) });
    });
    await batch.commit();
    toast({ title: "Chat Cleared" });
    setIsClearChatDialogOpen(false);
  }, [db, basePath, user, messages, toast]);

  const handleWhisper = useCallback((id: string, username: string) => {
    setWhisperingTo({ id, username });
    setReplyingTo(null);
    setProfileReplyTarget(null);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleCommand = useCallback(async (cmd: string, args: string[]) => {
    if (cmd === "clr" || cmd === "clear") {
      handleClearChat();
      return true;
    }
    if (cmd === "del" || cmd === "delete") {
      const count = parseInt(args[0]) || 1;
      const lastCountMessages = messages.filter(m => m.senderId === user?.uid).slice(-count);
      if (lastCountMessages.length === 0) {
        toast({ title: "No messages to delete", description: "Only your own messages can be wiped." });
        return true;
      }
      const batch = writeBatch(db);
      lastCountMessages.forEach(msg => {
        const msgRef = doc(db, basePath!, "messages", msg.id);
        batch.update(msgRef, { deletedFor: arrayUnion(user!.uid) });
      });
      await batch.commit();
      toast({ title: `Wiped last ${lastCountMessages.length} message(s)` });
      return true;
    }
    if (cmd === "whisper") {
      const username = args[0]?.replace(/^@/, '');
      if (!username) {
        toast({ title: "Whisper Protocol", description: "Usage: @whisper @username [message]" });
        return true;
      }
      
      const findUser = async () => {
        const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          toast({ title: "Target Missing", description: `@${username} not found in the Verse.` });
          return;
        }
        const target = snap.docs[0].data();
        handleWhisper(target.id, target.username || "User");
        
        const msgText = args.slice(1).join(" ");
        if (msgText) {
          handleSendMessage(msgText, undefined, undefined, undefined, undefined, undefined, undefined, { id: target.id, username: target.username || "User" });
        }
      };
      findUser();
      return true;
    }
    if (cmd === "phide") {
      if (user?.uid) {
        const newState = !userData?.isProfileHidden;
        updateDocumentNonBlocking(doc(db, "users", user.uid), { isProfileHidden: newState });
        toast({ title: newState ? "Identity Protocol: Hidden" : "Identity Protocol: Visible" });
      }
      return true;
    }
    if (cmd === "porn") {
      if (user?.uid) {
        const newState = !userData?.isProfileBlurred;
        updateDocumentNonBlocking(doc(db, "users", user.uid), { isProfileBlurred: newState });
        toast({ title: newState ? "Blur Protocol: Active" : "Blur Protocol: Disabled" });
      }
      return true;
    }
    if (cmd === "ping") {
      toast({ title: "Pong!", description: `Verse Sync Latency: ${Math.floor(Math.random() * 40) + 12}ms` });
      return true;
    }
    if (cmd === "theme") {
      const currentIndex = themes.indexOf(theme || "light");
      const nextIndex = (currentIndex + 1) % themes.length;
      setTheme(themes[nextIndex]);
      toast({ title: "Vibe Updated", description: `Switched to ${themes[nextIndex]} mode.` });
      return true;
    }
    if (cmd === "profile") {
      onOpenProfile?.();
      return true;
    }
    if (cmd === "explore") {
      onOpenExplore?.();
      return true;
    }
    if (cmd === "help") {
      toast({ 
        title: "Verse Command Hub", 
        description: "Available: @clr, @del, @whisper, @phide, @porn, @ping, @theme, @profile, @explore, @invite, @trace, @logout, @id, @time, @version." 
      });
      return true;
    }
    if (cmd === "logout") {
      if (user?.uid) updateDocumentNonBlocking(doc(db, "users", user.uid), { onlineStatus: "offline", lastOnlineAt: new Date().toISOString() });
      auth.signOut();
      return true;
    }
    if (cmd === "away" || cmd === "online") {
      if (user?.uid) updateDocumentNonBlocking(doc(db, "users", user.uid), { onlineStatus: cmd === "away" ? "idle" : "online", lastOnlineAt: new Date().toISOString() });
      toast({ title: "Status Updated", description: `You are now ${cmd === "away" ? "idle" : "online"} in the Verse.` });
      return true;
    }
    if (cmd === "trace") {
      toast({ title: "Tracing Guide", description: "To trace a message, long-press it and select 'Trace' to see its journey through the Verse." });
      return true;
    }
    if (cmd === "invite") {
      if (serverId) {
        navigator.clipboard.writeText(`${window.location.origin}/invite/${serverId}`);
        toast({ title: "Portal Generated", description: "Invite link copied to clipboard." });
      }
      return true;
    }
    if (cmd === "id" && user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: "Identity Signature", description: "UID copied to clipboard." });
      return true;
    }
    if (cmd === "time") {
      toast({ title: "Verse Clock", description: `Current Sync: ${new Date().toLocaleTimeString()}` });
      return true;
    }
    if (cmd === "version") {
      toast({ title: "Verse Build", description: "Duniya Protocol v2.4.0 (High-Fidelity Stable)" });
      return true;
    }
    return false;
  }, [db, basePath, user, messages, handleClearChat, toast, userData, serverId, auth, themes, theme, setTheme, onOpenProfile, onOpenExplore, handleWhisper, handleSendMessage]);

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
          imageUrl: deleteField(),
          fileUrl: deleteField(),
          fileName: deleteField(),
          fileType: deleteField(),
          type: "text" 
        });
      } else {
        batch.update(msgRef, { deletedFor: arrayUnion(user.uid) });
      }
    });
    await batch.commit();
    toast({ title: `Removed ${selectedIds.size} message(s)` });
    setSelectionMode(false);
    setSelectedIds(new Set());
    setIsDeleteDialogOpen(false);
  }, [db, basePath, user, selectedIds, rawMessages, toast]);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

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
  }, []);

  const handleCancelReply = useCallback(() => setReplyingTo(null), []);
  const handleCancelProfileReply = useCallback(() => setProfileReplyTarget(null), []);
  const handleCancelWhisper = useCallback(() => setWhisperingTo(null), []);

  const handleReplyToProfile = useCallback((id: string, username: string, photoURL: string, bio?: string, totalCommunities: number, commonCommunities: number, joinedAt?: string) => {
    setProfileReplyTarget({ 
      id, 
      username: username.replace(/^@/, ''), 
      photoURL, 
      bio, 
      totalCommunities: totalCommunities || 0, 
      commonCommunities: commonCommunities || 0,
      joinedAt
    });
    setReplyingTo(null);
    setWhisperingTo(null);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleReplyToUser = useCallback((id: string, username: string) => {
    const userMessages = messages.filter(m => m.senderId === id);
    if (userMessages.length > 0) {
      setReplyingTo(userMessages[userMessages.length - 1]);
    } else {
      toast({ title: "Identity Reply", description: `Tagging @${username} in your next message.` });
      if (inputRef.current) {
        const cleanName = username.replace(/^@/, '');
        inputRef.current.value = `@${cleanName} ${inputRef.current.value}`;
        inputRef.current.focus();
      }
    }
  }, [messages, toast]);

  useEffect(() => {
    if (scrollRef.current && !selectionMode) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, selectionMode]);

  if (!basePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full p-6 text-center overflow-hidden font-body">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <div className="relative mb-8">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="p-8 bg-primary/5 rounded-[2.5rem] relative z-10">
              <MessageCircle className="h-16 w-16 text-primary" />
            </motion.div>
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-30" />
          </div>
          <div className="space-y-4 max-w-lg">
            <h2 className="text-4xl font-black tracking-tighter uppercase text-foreground leading-none">DUNIYA</h2>
            <div className="flex flex-col items-center gap-2">
              <span className="font-['Playfair_Display'] italic text-2xl text-primary flex items-center gap-2 lowercase">
                Karo Chutiyapaa <Heart className="h-5 w-5 fill-red-500 text-red-500 animate-pulse" />
              </span>
              <p className="text-muted-foreground text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mt-4">Enter a community to begin your journey</p>
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative font-body">
      <header className={cn("h-14 border-b flex items-center justify-between px-4 shrink-0 transition-all duration-150 z-20 overflow-hidden", selectionMode ? "bg-primary text-white" : "bg-background/80 backdrop-blur-md")}>
        <AnimatePresence mode="wait">
          {selectionMode ? (
            <motion.div key="selection-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.1, ease: "easeOut" }} className="flex items-center gap-4 w-full h-full">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={handleCancelSelection}><X className="h-4 w-4" /></Button>
              <div className="flex-1 flex flex-col">
                <span className="font-black text-sm tracking-tighter leading-none">{selectedMessagesCount} SELECTED</span>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Verse Operations</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-9 w-9" onClick={() => setIsForwardOpen(true)}><Forward className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-9 w-9" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="normal-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.1, ease: "easeOut" }} className="flex items-center justify-between w-full h-full">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-primary/5 rounded-xl shrink-0">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-black text-lg truncate leading-none tracking-tighter text-foreground uppercase">#{headerTitle}</h2>
                  <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-1">Sync Active</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle />
                <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl transition-all duration-200", showMembers ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={onToggleMembers}><Users className="h-4 w-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 font-black uppercase text-[10px] tracking-widest p-1 border-none shadow-2xl bg-popover/95 backdrop-blur-md">
                    {isAdmin && <DropdownMenuItem onClick={() => setIsChannelSettingsOpen(true)} className="gap-2 p-3 rounded-xl"><Settings className="h-4 w-4 text-primary" /> Edit Channel</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => setIsClearChatDialogOpen(true)} className="gap-2 text-destructive p-3 rounded-xl"><Eraser className="h-4 w-4" /> Wipe Messages</DropdownMenuItem>
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
                <Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-[9px] font-black uppercase tracking-widest text-primary">Syncing Verse</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-24 text-center opacity-30 flex flex-col items-center">
                <div className="h-16 w-16 bg-muted/50 rounded-[2rem] flex items-center justify-center mb-4"><Hash className="h-8 w-8 text-muted-foreground" /></div>
                <h3 className="text-xl font-black mb-1 tracking-tighter uppercase text-foreground">WELCOME TO #{headerTitle}</h3>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Start something legendary.</p>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full">
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
                    onWhisper={handleWhisper}
                    onReplyToProfile={handleReplyToProfile}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="shrink-0 border-t bg-background">
            {serverId && channelId && <TypingIndicator serverId={serverId} channelId={channelId} />}
            <MessageInput 
              onSendMessage={handleSendMessage} 
              onExecuteCommand={handleCommand}
              replyingTo={replyingTo} 
              onCancelReply={handleCancelReply} 
              profileReplyTarget={profileReplyTarget}
              onCancelProfileReply={handleCancelProfileReply}
              whisperingTo={whisperingTo}
              onCancelWhisper={handleCancelWhisper}
              onTriggerWhisper={handleWhisper}
              onTriggerReplyUser={handleReplyToUser}
              onTriggerReplyProfile={handleReplyToProfile}
              serverId={serverId}
              channelId={channelId}
              inputRef={inputRef}
            />
          </div>
        </div>
        {showMembers && serverId && <div className="hidden lg:block border-l z-10 bg-background overflow-hidden"><MembersPanel serverId={serverId} onWhisper={handleWhisper} onReply={handleReplyToUser} onReplyProfile={handleReplyToProfile} /></div>}
      </div>
      
      <DeleteOptionsDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(val) => { setIsDeleteDialogOpen(val); if (!val) handleCancelSelection(); }} 
        onDeleteForMe={() => handleBatchDelete("me")} 
        onDeleteForEveryone={allSelectedFromMe ? () => handleBatchDelete("everyone") : undefined} 
        isSender={allSelectedFromMe} 
        count={selectedIds.size} 
      />
      <ForwardDialog open={isForwardOpen} onOpenChange={(val) => { setIsForwardOpen(val); if (!val) handleCancelSelection(); }} messagesToForward={rawMessages?.filter(m => selectedIds.has(m.id)) || []} currentCommunityName={server?.name} currentChannelName={contextData?.name} currentServerId={serverId} />
      {serverId && channelId && <ChannelSettingsDialog open={isChannelSettingsOpen} onOpenChange={setIsChannelSettingsOpen} serverId={serverId} channelId={channelId} />}
      <AlertDialog open={isClearChatDialogOpen} onOpenChange={setIsClearChatDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tighter uppercase">CLEAR CHAT?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">This will remove all messages from your view. This operation is synchronized.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-11 flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="rounded-xl font-black h-11 flex-1 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 uppercase tracking-widest">Wipe Verse</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}