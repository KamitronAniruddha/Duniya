
"use client";

import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, arrayUnion, arrayRemove, deleteField, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { Reply, CornerDownRight, Play, Pause, MoreHorizontal, Trash2, Ban, Copy, Timer, Check, CheckCheck, Forward, Landmark, Mic, Maximize2, Heart, Download, FileText, File, Eye, Ghost, Lock, Smile, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { MessageTraceDialog } from "./message-trace-dialog";
import { ForwardDialog } from "./forward-dialog";
import { DeleteOptionsDialog } from "./delete-options-dialog";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ForwardHop {
  communityName: string;
  channelName: string;
  viaCommunity?: string;
  viaChannel?: string;
  senderName: string;
  timestamp: string;
  isInitial?: boolean;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

const EMOJI_CATEGORIES = [
  { id: "smileys", icon: <Smile className="h-4 w-4" />, label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"] },
  { id: "animals", icon: <Ghost className="h-4 w-4" />, label: "Animals", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🕸", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🐐", "🦌", "🐕", "🐩", "🦮", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"] }
];

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    senderName?: string;
    senderPhotoURL?: string;
    content: string;
    type?: string;
    audioUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    sentAt: any;
    isDeleted?: boolean;
    replyTo?: {
      messageId: string;
      senderName: string;
      senderPhotoURL?: string;
      text: string;
    };
    whisperTo?: string | null;
    whisperToUsername?: string | null;
    disappearingEnabled?: boolean;
    disappearDuration?: number;
    senderExpireAt?: string;
    viewerExpireAt?: Record<string, string>;
    seenBy?: string[];
    fullyDeleted?: boolean;
    isForwarded?: boolean;
    forwardingChain?: ForwardHop[];
    deletedFor?: string[];
    reactions?: Record<string, string[]>;
  };
  messagePath: string;
  isMe: boolean;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onReply?: () => void;
  onWhisper?: (userId: string, username: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ 
  message, 
  messagePath,
  isMe, 
  isSelected, 
  selectionMode,
  onSelect,
  onLongPress,
  onReply,
  onWhisper
}: MessageBubbleProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [isPDFViewOpen, setIsPDFViewOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isFullPickerOpen, setIsFullPickerOpen] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<{ emoji: string; uids: string[] } | null>(null);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 400;

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isDisappeared, setIsDisappeared] = useState(false);

  const waveformHeights = useMemo(() => [8, 12, 16, 10, 14, 18, 6, 12, 15, 9, 13, 17, 7, 11, 14, 10, 16, 12, 8, 10], []);

  const formattedTime = useMemo(() => {
    if (!message.sentAt) return "";
    const date = new Date(message.sentAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.sentAt]);

  useEffect(() => {
    if (!user || isMe || message.isDeleted || message.fullyDeleted || !messagePath) return;
    const hasSeen = message.seenBy?.includes(user.uid);
    if (!hasSeen) {
      const msgRef = doc(db, messagePath);
      const updateData: any = { seenBy: arrayUnion(user.uid) };
      if (message.disappearingEnabled) {
        const expireAt = new Date(Date.now() + (message.disappearDuration || 10000)).toISOString();
        updateData[`viewerExpireAt.${user.uid}`] = expireAt;
      }
      updateDocumentNonBlocking(msgRef, updateData);
    }
  }, [message.id, user?.uid, isMe, messagePath, db]);

  useEffect(() => {
    if (!message.disappearingEnabled || !user || message.isDeleted || message.fullyDeleted) return;
    const timer = setInterval(() => {
      let expireAtStr = isMe ? message.senderExpireAt : message.viewerExpireAt?.[user.uid];
      if (expireAtStr) {
        const diff = new Date(expireAtStr).getTime() - new Date().getTime();
        if (diff <= 0) {
          setIsDisappeared(true);
          setTimeRemaining(0);
          clearInterval(timer);
        } else {
          setTimeRemaining(Math.ceil(diff / 1000));
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [message.disappearingEnabled, message.senderExpireAt, message.viewerExpireAt, user?.uid, isMe, message.isDeleted, message.fullyDeleted]);

  const isActuallyDeleted = message.isDeleted || isDisappeared || message.fullyDeleted;

  const handleToggleReaction = useCallback((emoji: string) => {
    if (!user || !messagePath || isActuallyDeleted) return;
    const msgRef = doc(db, messagePath);
    const existingReactionUsers = message.reactions?.[emoji] || [];
    const hasReacted = existingReactionUsers.includes(user.uid);

    updateDocumentNonBlocking(msgRef, {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
    setIsReactionPickerOpen(false);
    setIsFullPickerOpen(false);
  }, [user, messagePath, message.reactions, isActuallyDeleted, db]);

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Starting Download", description: name });
  };

  const renderContent = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(/(\*\*.*?\*\*|__.*?__|\[\[serif\]\].*?\[\[\/serif\]\]|\[\[mono\]\].*?\[\[\/mono\]\]|https?:\/\/[^\s]+)/g);

    return parts.map((part, i) => {
      if (!part) return null;
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={cn(
              "underline font-bold decoration-2 underline-offset-2 hover:opacity-70 transition-all break-all", 
              isMe ? "text-white" : "text-primary",
              message.whisperTo && "text-indigo-200"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
      if (part.startsWith('__') && part.endsWith('__')) return <em key={i} className="italic font-semibold">{part.slice(2, -2)}</em>;
      if (part.startsWith('[[serif]]') && part.endsWith('[[/serif]]')) return <span key={i} className="font-['Playfair_Display'] italic text-[1.1em] leading-none">{part.slice(9, -10)}</span>;
      if (part.startsWith('[[mono]]') && part.endsWith('[[/mono]]')) return <span key={i} className="font-mono bg-black/10 px-1 rounded-sm">{part.slice(8, -9)}</span>;
      return part;
    });
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (selectionMode || isActuallyDeleted) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    startX.current = clientX;
    startY.current = clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
    longPressTimer.current = setTimeout(() => {
      if (!selectionMode && !isActuallyDeleted) {
        onLongPress?.(message.id);
        setIsDragging(false);
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      }
    }, LONG_PRESS_DURATION);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || selectionMode || isActuallyDeleted) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const diffX = clientX - startX.current;
    const diffY = clientY - startY.current;
    
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > Math.abs(diffY)) isHorizontalSwipe.current = true;
      else if (Math.abs(diffY) > 5) {
        isHorizontalSwipe.current = false;
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        setIsDragging(false);
        return;
      }
    }
    if (isHorizontalSwipe.current && !selectionMode && diffX > 0 && !isActuallyDeleted) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      const rubberBand = Math.pow(diffX, 0.85);
      setDragX(Math.min(rubberBand * 2, 100));
    }
  };

  const handleEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!isDragging) return;
    if (dragX >= 60 && !selectionMode && !isActuallyDeleted) onReply?.();
    setDragX(0);
    setIsDragging(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const latestHop = message.forwardingChain?.[message.forwardingChain.length - 1];

  const reactionsData = useMemo(() => {
    if (!message.reactions) return [];
    return Object.entries(message.reactions)
      .filter(([_, uids]) => uids && uids.length > 0)
      .map(([emoji, uids]) => ({
        emoji,
        count: uids.length,
        hasReacted: user ? uids.includes(user.uid) : false,
        uids
      }));
  }, [message.reactions, user]);

  return (
    <div 
      className={cn(
        "flex w-full py-0.5 group items-end relative transition-colors duration-150 rounded-2xl select-none font-body", 
        isMe ? "flex-row-reverse" : "flex-row",
        isSelected && "bg-primary/10"
      )}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseUpCapture={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onClick={(e) => {
        if (selectionMode) {
          e.stopPropagation();
          if (!isActuallyDeleted) onSelect?.(message.id);
        }
      }}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center transition-all duration-150 overflow-hidden",
        selectionMode ? "w-10 opacity-100" : "w-0 opacity-0",
        isMe ? "ml-1" : "mr-1"
      )}>
        <div className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
            isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/20",
            isActuallyDeleted && "opacity-0 pointer-events-none"
          )}
        >
          {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
        </div>
      </div>

      <AnimatePresence>
        {dragX >= 60 && !isActuallyDeleted && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.1, ease: "easeOut" }} className="absolute left-6 top-1/2 -translate-y-1/2 bg-primary/20 rounded-full h-8 w-8 flex items-center justify-center pointer-events-none z-10 backdrop-blur-sm shadow-lg">
            <Reply className="h-4 w-4 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      {!isMe && !selectionMode && (
        <UserProfilePopover 
          userId={message.senderId} 
          onWhisper={onWhisper} 
          onReply={() => onReply?.()}
          side="right"
        >
          <button className="h-8 w-8 mb-0.5 mr-2 shrink-0 transition-transform active:scale-95">
            <Avatar className="h-full w-full border border-border shadow-sm aspect-square">
              <AvatarImage src={message.senderPhotoURL} className="aspect-square object-cover" />
              <AvatarFallback className="text-[9px] font-black bg-primary text-primary-foreground">{message.senderName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
          </button>
        </UserProfilePopover>
      )}
      
      <div className={cn("flex flex-col max-w-[75%] relative transition-all duration-150 ease-out", isMe ? "items-end" : "items-start")} style={{ transform: `translateX(${dragX}px)` }}>
        {isActuallyDeleted ? (
          <div className={cn("px-4 py-2 rounded-[1.25rem] text-[10px] font-bold italic opacity-60 flex items-center gap-2 border shadow-none bg-card/50 backdrop-blur-sm", isMe ? "rounded-br-none" : "rounded-bl-none")}>
            <Ban className="h-3.5 w-3.5" />
            {isDisappeared ? "This message vanished" : (isMe ? "You deleted this message" : "This message was deleted")}
          </div>
        ) : (
          <>
            {!isMe && !selectionMode && (
              <UserProfilePopover 
                userId={message.senderId} 
                onWhisper={onWhisper} 
                onReply={() => onReply?.()}
                side="right"
              >
                <button className="text-[9px] font-black text-muted-foreground/60 ml-1 mb-0.5 hover:text-primary uppercase tracking-widest transition-colors">{message.senderName || "..."}</button>
              </UserProfilePopover>
            )}
            
            <div className={cn(
              "px-3 py-2 rounded-[1.25rem] shadow-sm transition-all duration-150 relative group/bubble",
              isMe ? "bg-primary text-primary-foreground rounded-br-none shadow-primary/10" : "bg-card text-foreground rounded-bl-none border border-border shadow-black/5",
              message.whisperTo && (isMe ? "bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-indigo-500/20 text-white" : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 backdrop-blur-md"),
              selectionMode && !isActuallyDeleted && "cursor-pointer active:scale-[0.98]",
              (message.imageUrl || message.type === 'file') && "p-1 pb-2"
            )}>
              {message.whisperTo && (
                <div className={cn("flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] w-fit border border-white/20", isMe ? "bg-white/10 text-white" : "bg-indigo-500 text-white")}>
                  <Lock className="h-2.5 w-2.5" /> PRIVATE WHISPER {isMe ? `@${message.whisperToUsername}` : "TO YOU"}
                </div>
              )}

              {message.isForwarded && (
                <div className={cn("flex flex-col mb-1.5 opacity-80 px-2 pt-1", isMe ? "items-end" : "items-start")}>
                  <button onClick={(e) => { e.stopPropagation(); setIsTraceOpen(true); }} className={cn("flex items-center gap-1 italic text-[8px] font-black uppercase tracking-widest transition-all", isMe ? "text-primary-foreground/90" : "text-muted-foreground")}>
                    <Forward className="h-2 w-2" /> Forwarded
                  </button>
                  {latestHop && (
                    <div className={cn("flex items-center gap-1 text-[7px] font-black tracking-tight mt-0.5 opacity-60", isMe ? "text-primary-foreground" : "text-primary")}>
                      <Landmark className="h-2 w-2" />
                      <span>{(latestHop?.communityName || "VERSE").toUpperCase()} {' > '} #{(latestHop?.channelName || "GENERAL").toUpperCase()}</span>
                    </div>
                  )}
                </div>
              )}

              {message.replyTo && (
                <button className={cn("w-full text-left mb-2 p-2 rounded-xl border-l-2 text-[11px] bg-black/5 flex flex-col gap-0.5 backdrop-blur-sm transition-colors mx-auto max-w-[calc(100%-8px)]", isMe ? "border-primary-foreground/40" : "border-primary/50")}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Avatar className="h-4 w-4 border shadow-sm">
                      <AvatarImage src={message.replyTo.senderPhotoURL} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white text-[6px] font-black">{String(message.replyTo.senderName || "U")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className={cn("font-black text-[9px] flex items-center gap-1 uppercase tracking-wider", isMe ? "text-primary-foreground" : "text-primary")}>
                      <CornerDownRight className="h-3 w-3" />{message.replyTo.senderName}
                    </span>
                  </div>
                  <p className={cn("line-clamp-1 italic font-medium px-1", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>{message.replyTo.text}</p>
                </button>
              )}

              {message.type === 'media' && message.audioUrl ? (
                <div className="flex items-center gap-3 py-2 min-w-[220px] max-w-full px-2">
                  <audio ref={audioRef} src={message.audioUrl} onTimeUpdate={() => { if (audioRef.current && audioRef.current.duration) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); }} onEnded={() => { setIsPlaying(false); setProgress(0); }} />
                  <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full shadow-lg shrink-0 transition-transform active:scale-95", isMe ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")} onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                  </Button>
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-0.5 h-6 items-center">
                      {waveformHeights.map((h, i) => (
                        <div key={i} className={cn("w-1 rounded-full shrink-0 transition-all duration-300", isMe ? (progress > (i * 5) ? "bg-primary-foreground" : "bg-primary-foreground/30") : (progress > (i * 5) ? "bg-primary" : "bg-primary/20"), isPlaying ? "animate-pulse" : "h-1")} style={{ height: isPlaying ? `${h}px` : '4px' }} />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                       <span className={cn("text-[8px] font-black", isMe ? "text-primary-foreground/70" : "text-muted-foreground/70")}>{audioRef.current ? `${Math.floor(audioRef.current.currentTime)}s` : "0:00"}</span>
                       <Mic className={cn("h-2.5 w-2.5", isMe ? "text-primary-foreground/40" : "text-primary/40")} />
                    </div>
                  </div>
                </div>
              ) : message.type === 'media' && message.videoUrl ? (
                <div className="relative group/video overflow-hidden rounded-2xl aspect-square w-56 md:w-64 bg-black shadow-xl mx-auto">
                  <video ref={videoRef} src={message.videoUrl} className="w-full h-full object-cover" loop muted={!isVideoPlaying} autoPlay playsInline onClick={(e) => { e.stopPropagation(); setIsVideoPlaying(!isVideoPlaying); }} />
                </div>
              ) : message.type === 'media' && message.imageUrl ? (
                <div className="relative group/image overflow-hidden rounded-2xl w-56 md:w-64 bg-muted/20 shadow-xl mx-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsImageZoomOpen(true); }}>
                  <img src={message.imageUrl} className="w-full h-auto object-cover max-h-80" alt="Sent image" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-3 bg-background/20 backdrop-blur-md rounded-full">
                      <Maximize2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ) : (message.type === 'file' || message.fileUrl) && message.fileUrl ? (
                <div className="flex items-center gap-3 p-3 bg-black/5 rounded-2xl border border-black/10 min-w-[200px] max-w-full">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0", isMe ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>
                    {message.fileType?.includes('pdf') ? <FileText className="h-5 w-5" /> : <File className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className={cn("text-xs font-bold truncate", isMe ? "text-primary-foreground" : "text-foreground")}>{message.fileName || "Document"}</span>
                    <span className={cn("text-[8px] font-black uppercase opacity-60", isMe ? "text-primary-foreground" : "text-muted-foreground")}>{message.fileType?.split('/')[1]?.toUpperCase() || "FILE"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {message.fileType?.includes('pdf') && (
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full hover:bg-black/10 transition-colors", isMe ? "text-primary-foreground" : "text-primary")} onClick={(e) => { e.stopPropagation(); setIsPDFViewOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full hover:bg-black/10 transition-colors", isMe ? "text-primary-foreground" : "text-primary")} onClick={(e) => { e.stopPropagation(); handleDownload(message.fileUrl!, message.fileName!); }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "whitespace-pre-wrap break-words leading-snug text-sm font-medium tracking-tight px-2",
                  message.whisperTo && "font-mono text-xs opacity-90"
                )}>
                  {renderContent(message.content)}
                </div>
              )}

              {(message.imageUrl || message.type === 'file' || message.fileUrl) && message.content && (
                <div className={cn(
                  "mt-2 px-2 whitespace-pre-wrap break-words leading-snug text-sm font-medium tracking-tight",
                  message.whisperTo && "font-mono text-xs opacity-90"
                )}>
                  {renderContent(message.content)}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 mt-1.5 px-2">
                {message.disappearingEnabled && (
                  <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border shadow-sm", isMe ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" : "bg-primary/10 border-primary/20 text-primary")}>
                    <Timer className="h-2.5 w-2.5 animate-pulse" />
                    {timeRemaining !== null ? <span>{timeRemaining}S</span> : <span>...</span>}
                  </div>
                )}
                <div className={cn("text-[8px] font-black ml-auto flex items-center gap-1 tracking-widest opacity-60", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                  {formattedTime}
                  {isMe && <div className="flex items-center">{message.seenBy && message.seenBy.length > 0 ? <CheckCheck className="h-3 w-3 text-cyan-400" /> : <Check className="h-3 w-3 text-primary-foreground/40" />}</div>}
                </div>
              </div>

              {reactionsData.length > 0 && (
                <div className={cn("flex flex-wrap gap-1 mt-2 -mb-1", isMe ? "justify-end" : "justify-start")}>
                  {reactionsData.map(({ emoji, count, hasReacted, uids }) => (
                    <motion.button
                      key={emoji}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (e.shiftKey || count > 1) setReactionDetails({ emoji, uids });
                        else handleToggleReaction(emoji); 
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setReactionDetails({ emoji, uids });
                      } }
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black transition-all border shadow-sm",
                        hasReacted 
                          ? "bg-primary/20 border-primary text-primary" 
                          : "bg-background/50 border-border text-foreground/70 hover:bg-muted"
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 1 && <span>{count}</span>}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!selectionMode && !isActuallyDeleted && (
        <div className={cn("mb-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1", isMe ? "mr-1 flex-row-reverse" : "ml-1 flex-row")}>
          
          <div className="flex items-center gap-0.5 bg-background/80 backdrop-blur-md rounded-full border border-border p-0.5 shadow-sm">
            <Popover open={isReactionPickerOpen} onOpenChange={setIsReactionPickerOpen}>
              <PopoverTrigger asChild>
                <button className="h-7 w-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors active:scale-90">
                  <Smile className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align={isMe ? "end" : "start"} className="w-fit p-1.5 rounded-full border-none shadow-2xl bg-popover/95 backdrop-blur-xl flex items-center gap-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleToggleReaction(emoji)}
                    className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded-full transition-all hover:scale-125 active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
                
                <div className="w-[1px] h-4 bg-border/50 mx-1" />
                
                <Popover open={isFullPickerOpen} onOpenChange={setIsFullPickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full transition-all active:scale-90">
                      <Plus className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="center" className="w-80 p-0 overflow-hidden bg-popover border-none shadow-2xl rounded-2xl">
                    <Tabs defaultValue="smileys" className="w-full">
                      <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0 h-10">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <TabsTrigger key={cat.id} value={cat.id} className="flex-1 rounded-none data-[state=active]:bg-background">{cat.icon}</TabsTrigger>
                        ))}
                      </TabsList>
                      {EMOJI_CATEGORIES.map((cat) => (
                        <TabsContent key={cat.id} value={cat.id} className="m-0">
                          <ScrollArea className="h-64 p-2">
                            <div className="grid grid-cols-8 gap-1">
                              {cat.emojis.map((emoji, idx) => (
                                <button key={idx} type="button" onClick={() => handleToggleReaction(emoji)} className="text-xl hover:bg-muted rounded aspect-square flex items-center justify-center transition-transform active:scale-125">{emoji}</button>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </PopoverContent>
                </Popover>
              </PopoverContent>
            </Popover>
            <button onClick={(e) => { e.stopPropagation(); setIsForwardOpen(true); }} className="h-7 w-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors active:scale-90"><Forward className="h-3.5 w-3.5" /></button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors active:scale-90"><MoreHorizontal className="h-3.5 w-3.5" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-xl font-black uppercase text-[9px] tracking-widest p-1 border-none shadow-xl bg-popover/95 backdrop-blur-md">
                <DropdownMenuItem onClick={() => onReply?.()} className="gap-2 p-2 rounded-lg"><Reply className="h-3 w-3 text-primary" /> Reply</DropdownMenuItem>
                {!isMe && <DropdownMenuItem onClick={() => onWhisper?.(message.senderId, message.senderName || "User")} className="gap-2 p-2 rounded-lg"><Ghost className="h-3 w-3 text-indigo-500" /> Whisper</DropdownMenuItem>}
                {message.fileType?.includes('pdf') && <DropdownMenuItem onClick={() => setIsPDFViewOpen(true)} className="gap-2 p-2 rounded-lg"><Eye className="h-3 w-3 text-primary" /> View PDF</DropdownMenuItem>}
                {message.imageUrl && <DropdownMenuItem onClick={() => handleDownload(message.imageUrl!, message.fileName || "image.jpg")} className="gap-2 p-2 rounded-lg"><Download className="h-3 w-3 text-primary" /> Download</DropdownMenuItem>}
                {message.fileUrl && <DropdownMenuItem onClick={() => handleDownload(message.fileUrl!, message.fileName || "file")} className="gap-2 p-2 rounded-lg"><Download className="h-3 w-3 text-primary" /> Download</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Copied" }); }} className="gap-2 p-2 rounded-lg"><Copy className="h-3 w-3 text-primary" /> Copy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsForwardOpen(true)} className="gap-2 p-2 rounded-lg"><Forward className="h-3 w-3 text-primary" /> Forward</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive gap-2 p-2 rounded-lg"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {message.forwardingChain && <MessageTraceDialog open={isTraceOpen} onOpenChange={setIsTraceOpen} chain={message.forwardingChain} />}
      {!isActuallyDeleted && <ForwardDialog open={isForwardOpen} onOpenChange={setIsForwardOpen} messagesToForward={[message]} />}
      {!isActuallyDeleted && <DeleteOptionsDialog open={isDeleteDialogOpen} onOpenChange={(val) => { setIsDeleteDialogOpen(val); if (!val && selectionMode) { onSelect?.(""); } }} onDeleteForMe={() => { if (!db || !messagePath || !user) return; updateDocumentNonBlocking(doc(db, messagePath), { deletedFor: arrayUnion(user.uid) }); toast({ title: "Removed Locally" }); }} onDeleteForEveryone={() => { if (!db || !messagePath) return; updateDocumentNonBlocking(doc(db, messagePath), { isDeleted: true, content: "This message was deleted", audioUrl: deleteField(), videoUrl: deleteField(), imageUrl: deleteField(), fileUrl: deleteField(), type: "text" }); toast({ title: "Wiped" }); }} isSender={isMe} />}
      
      <ReactionDetailsDialog 
        open={!!reactionDetails} 
        onOpenChange={(open) => !open && setReactionDetails(null)} 
        emoji={reactionDetails?.emoji || ""} 
        uids={reactionDetails?.uids || []} 
      />

      <Dialog open={isImageZoomOpen} onOpenChange={setIsImageZoomOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Image View</DialogTitle>
            <DialogDescription>Full-sized view of the sent image.</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }} className="relative group">
              <img src={message.imageUrl} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" alt="Zoomed view" />
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-background/80 backdrop-blur-md rounded-full border border-border shadow-2xl whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Verse Media</span>
                  <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
                </div>
                <div className="w-[1px] h-4 bg-border" />
                <button 
                  onClick={() => { onReply?.(); setIsImageZoomOpen(false); }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors"
                >
                  <Reply className="h-3.5 w-3.5" /> Reply
                </button>
                <div className="w-[1px] h-4 bg-border" />
                <button onClick={() => handleDownload(message.imageUrl!, message.fileName || "image.jpg")} className="flex items-center gap-2 text-[10px] font-black uppercase text-foreground hover:text-primary transition-colors">
                  <Download className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPDFViewOpen} onOpenChange={setIsPDFViewOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90svh] p-0 border-none shadow-2xl bg-background overflow-hidden flex flex-col rounded-[2rem] sm:rounded-[2.5rem]">
          <DialogHeader className="p-4 md:p-6 pb-2 bg-gradient-to-b from-primary/10 to-transparent shrink-0 flex flex-row items-center justify-between border-b">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <DialogTitle className="text-lg md:text-xl font-black tracking-tight uppercase truncate pr-4">
                {message.fileName || "PDF Viewer"}
              </DialogTitle>
              <DialogDescription className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Verse Document Preview
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-8 md:h-10 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-background/50 backdrop-blur-sm px-3 md:px-4" onClick={() => handleDownload(message.fileUrl!, message.fileName || "document.pdf")}>
                <Download className="h-3 w-3 mr-1.5 md:mr-2 text-primary" /> Save
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full bg-muted/10 relative overflow-hidden">
            <iframe 
              src={message.fileUrl} 
              className="absolute inset-0 w-full h-full border-none" 
              title={message.fileName}
              style={{ colorScheme: 'light' }}
            />
            <div className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-md rounded-lg border text-[8px] font-black uppercase tracking-widest text-primary opacity-40 pointer-events-none">
              Verified by Duniya
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}, (prev, next) => {
  return prev.message.id === next.message.id && 
         prev.message.content === next.message.content &&
         prev.message.seenBy?.length === next.message.seenBy?.length &&
         prev.isSelected === next.isSelected &&
         prev.selectionMode === next.selectionMode &&
         prev.message.senderExpireAt === next.message.senderExpireAt &&
         prev.message.viewerExpireAt === next.message.viewerExpireAt &&
         JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions) &&
         JSON.stringify(prev.message.replyTo) === JSON.stringify(next.message.replyTo);
});

function ReactionDetailsDialog({ open, onOpenChange, emoji, uids }: { open: boolean; onOpenChange: (open: boolean) => void; emoji: string; uids: string[] }) {
  const db = useFirestore();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && uids.length > 0) {
      const fetchUsers = async () => {
        setIsLoading(true);
        try {
          const q = query(collection(db, "users"), where(documentId(), "in", uids.slice(0, 10)));
          const snap = await getDocs(q);
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("Failed to fetch reaction users", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsers();
    } else if (!open) {
      setUsers([]);
    }
  }, [open, uids, db]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-background h-fit max-h-[80vh] flex flex-col">
        <DialogHeader className="p-6 bg-gradient-to-b from-primary/5 to-transparent border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce [animation-duration:2s]">{emoji}</div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Reactions</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{uids.length} Participants</DialogDescription>
              </div>
            </div>
            <Users className="h-5 w-5 text-primary/40" />
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-30">
              <Plus className="h-6 w-6 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Identifying...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                  <UserProfilePopover userId={u.id} side="right">
                    <Avatar className="h-10 w-10 border border-border shadow-sm">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="bg-primary text-white font-black text-xs">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </UserProfilePopover>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black uppercase tracking-tight truncate">@{u.username}</span>
                    <span className="text-[9px] text-muted-foreground font-medium truncate italic">{u.bio || "Member of the Verse"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/20 border-t flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            <span>Identified by Duniya</span>
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <span>Aniruddha ❤️</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
