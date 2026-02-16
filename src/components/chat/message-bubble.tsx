"use client";

import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, arrayUnion, arrayRemove, deleteField, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { Reply, CornerDownRight, Play, Pause, MoreHorizontal, Trash2, Ban, Copy, Timer, Check, CheckCheck, Forward, Landmark, Mic, Maximize2, Heart, Download, FileText, File, Eye, Ghost, Lock, Smile, Plus, Users, Camera, Info, Sparkles, Globe, Activity, Zap, EyeOff, ShieldAlert, Milestone, Compass, Waves, ShieldCheck, Fingerprint } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { CreatorFooter } from "@/components/creator-footer";
import { formatDistanceToNow } from "date-fns";

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
    isSensitive?: boolean;
    replyTo?: {
      messageId: string;
      senderName: string;
      senderPhotoURL?: string;
      text: string;
      profileContext?: {
        targetUserId?: string;
        totalCommunities: number;
        commonCommunities: number;
        bio?: string;
        joinedAt?: string;
      }
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
  onReplyToProfile?: (userId: string, username: string, photoURL: string) => void;
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
  onWhisper,
  onReplyToProfile
}: MessageBubbleProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const senderRef = useMemoFirebase(() => doc(db, "users", message.senderId), [db, message.senderId]);
  const { data: senderData } = useDoc(senderRef);

  const isSenderHidden = !!senderData?.isProfileHidden && !isMe;
  const isSenderBlurred = !!senderData?.isProfileBlurred && !isMe && !senderData?.authorizedViewers?.some((v: any) => v.uid === user?.uid && new Date(v.expiresAt) > new Date());

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isIntelligenceOpen, setIsSharedIntelligenceOpen] = useState(false);

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
  }, [message.id, user?.uid, isMe, messagePath, db, message.seenBy, message.disappearingEnabled, message.disappearDuration, message.isDeleted, message.fullyDeleted]);

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
  }, [user, messagePath, message.reactions, isActuallyDeleted, db]);

  const handleDownload = useCallback((url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Starting Download", description: name });
  }, [toast]);

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

  const sensitiveMask = message.isSensitive && !isRevealed;

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

      {!isMe && !selectionMode && (
        <UserProfilePopover 
          userId={message.senderId} 
          onWhisper={onWhisper} 
          onReply={onReplyToProfile}
          side="right"
        >
          <button className="h-8 w-8 mb-0.5 mr-2 shrink-0 transition-transform active:scale-95">
            <Avatar className={cn(
              "h-full w-full border border-border shadow-sm aspect-square",
              isSenderBlurred && "blur-sm"
            )}>
              {isSenderHidden ? (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Ghost className="h-4 w-4" />
                </div>
              ) : (
                <>
                  <AvatarImage src={message.senderPhotoURL || undefined} className="aspect-square object-cover" />
                  <AvatarFallback className="text-[9px] font-black bg-primary text-primary-foreground">
                    {message.senderName?.[0]?.toUpperCase() || <Ghost className="h-3 w-3" />}
                  </AvatarFallback>
                </>
              )}
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
                onReply={onReplyToProfile}
                side="right"
              >
                <button className="text-[9px] font-black text-muted-foreground/60 ml-1 mb-0.5 hover:text-primary uppercase tracking-widest transition-colors">
                  @{message.senderName || "..."}
                  {isSenderHidden && <span className="ml-1 opacity-40 lowercase italic font-medium tracking-normal">(encrypted)</span>}
                </button>
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
                </div>
              )}

              {message.replyTo && (
                <button 
                  onClick={(e) => { e.stopPropagation(); if (message.replyTo?.messageId === 'profile') setIsSharedIntelligenceOpen(true); }}
                  className={cn(
                    "w-full text-left mb-2 p-2 rounded-xl border-l-2 text-[11px] bg-black/5 flex flex-col gap-0.5 backdrop-blur-sm transition-all hover:bg-black/10 mx-auto max-w-[calc(100%-8px)]", 
                    isMe ? "border-primary-foreground/40" : "border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Avatar className="h-4 w-4 border shadow-sm">
                      <AvatarImage src={message.replyTo.senderPhotoURL || undefined} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white text-[6px] font-black">{String(message.replyTo.senderName || "U")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className={cn("font-black text-[9px] flex items-center gap-1 uppercase tracking-wider truncate", isMe ? "text-primary-foreground" : "text-primary")}>
                      {message.replyTo.messageId === 'profile' ? <Camera className="h-3 w-3" /> : <CornerDownRight className="h-3 w-3" />}
                      {message.replyTo.senderName}
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
                        <div key={i} className={cn("w-1 rounded-full shrink-0 transition-all duration-300", isMe ? (progress > (i * 5) ? "bg-primary-foreground" : "bg-primary-foreground/30") : (progress > (i * 5) ? "bg-primary" : "bg-primary/20"), isPlaying ? "animate-pulse" : "h-1")} style={{ height: i < (progress / 5) ? `${h}px` : '4px' }} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : message.type === 'media' && message.imageUrl ? (
                <div className="relative group/image overflow-hidden rounded-2xl w-56 md:w-64 bg-muted/20 shadow-xl mx-auto">
                  <img src={message.imageUrl} className={cn("w-full h-auto object-cover max-h-80 transition-all", sensitiveMask && "blur-3xl grayscale")} alt="Sent image" onClick={(e) => { e.stopPropagation(); if (!sensitiveMask) setIsImageZoomOpen(true); }} />
                  {sensitiveMask && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center gap-3">
                      <ShieldAlert className="h-8 w-8 text-primary" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Sensitive Content</p>
                        <p className="text-[8px] font-medium text-muted-foreground leading-tight px-4">Flagged as sensitive content.</p>
                      </div>
                      <Button size="sm" className="h-8 rounded-xl font-black text-[9px] uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}>Reveal Content</Button>
                    </div>
                  )}
                  {!sensitiveMask && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="p-3 bg-background/20 backdrop-blur-md rounded-full">
                        <Maximize2 className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  )}
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
            </div>
          </>
        )}
      </div>

      {!selectionMode && !isActuallyDeleted && (
        <div className={cn("mb-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1", isMe ? "mr-1 flex-row-reverse" : "ml-1 flex-row")}>
          <div className="flex items-center gap-0.5 bg-background/80 backdrop-blur-md rounded-full border border-border p-0.5 shadow-sm">
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-7 w-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors active:scale-90">
                  <Smile className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align={isMe ? "end" : "start"} className="w-fit p-1.5 rounded-full border-none shadow-2xl bg-popover/95 backdrop-blur-xl flex items-center gap-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => handleToggleReaction(emoji)} className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded-full transition-all hover:scale-125 active:scale-90">{emoji}</button>
                ))}
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors active:scale-90"><MoreHorizontal className="h-3.5 w-3.5" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-xl font-black uppercase text-[9px] tracking-widest p-1 border-none shadow-xl bg-popover/95 backdrop-blur-md">
                <DropdownMenuItem onClick={() => onReply?.()} className="gap-2 p-2 rounded-lg"><Reply className="h-3 w-3 text-primary" /> Reply</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsForwardOpen(true)} className="gap-2 p-2 rounded-lg"><Forward className="h-3 w-3 text-primary" /> Forward</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive gap-2 p-2 rounded-lg"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {message.forwardingChain && <MessageTraceDialog open={isTraceOpen} onOpenChange={setIsTraceOpen} chain={message.forwardingChain} />}
      {!isActuallyDeleted && <ForwardDialog open={isForwardOpen} onOpenChange={setIsForwardOpen} messagesToForward={[message]} />}
      {!isActuallyDeleted && <DeleteOptionsDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onDeleteForMe={() => { if (messagePath) updateDocumentNonBlocking(doc(db, messagePath), { deletedFor: arrayUnion(user?.uid) }); }} onDeleteForEveryone={() => { if (messagePath) updateDocumentNonBlocking(doc(db, messagePath), { isDeleted: true, content: "Deleted message", type: "text" }); }} isSender={isMe} />}
      {message.replyTo?.messageId === 'profile' && (
        <SharedIntelligenceDialog 
          open={isIntelligenceOpen} 
          onOpenChange={setIsSharedIntelligenceOpen} 
          context={message.replyTo.profileContext} 
          targetName={message.replyTo.senderName} 
          senderName={message.senderName || "User"}
        />
      )}
    </div>
  );
});

function SharedIntelligenceDialog({ open, onOpenChange, context, targetName, senderName }: { open: boolean; onOpenChange: (open: boolean) => void; context: any; targetName: string; senderName: string }) {
  const db = useFirestore();
  const { user } = useUser();
  const targetRef = useMemoFirebase(() => (context?.targetUserId ? doc(db, "users", context.targetUserId) : null), [db, context?.targetUserId]);
  const { data: targetPrivacyData } = useDoc(targetRef);

  const isHidden = !!targetPrivacyData?.isProfileHidden && targetPrivacyData?.id !== user?.uid;
  const isBlurred = !!targetPrivacyData?.isProfileBlurred && 
                    targetPrivacyData?.id !== user?.uid && 
                    !targetPrivacyData?.authorizedViewers?.some((v: any) => v.uid === user?.uid && new Date(v.expiresAt) > new Date());

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const accountAge = useMemo(() => {
    if (!context?.joinedAt) return "Origin Era";
    try {
      return formatDistanceToNow(new Date(context.joinedAt));
    } catch {
      return "Unknown Era";
    }
  }, [context?.joinedAt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[3rem] border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] p-0 overflow-hidden bg-background h-fit max-h-[90vh] flex flex-col z-[2000]">
        <DialogHeader className="p-10 pb-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent shrink-0 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-primary animate-spin-slow" />
              <span className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/80">Social Depth Intelligence</span>
            </div>
            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">v2.4.0 High-Fidelity</span>
            </div>
          </div>
          <DialogTitle className="text-5xl font-[900] tracking-tighter uppercase leading-tight text-foreground relative z-10">
            Social <span className="text-primary italic">Pulse</span>
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground/80 text-sm mt-3 italic relative z-10 leading-relaxed">
            "Real-time decryption of digital lineage and Verse connectivity metrics."
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="p-10 pt-2 space-y-10"
          >
            {/* Main Identity Node */}
            <motion.div variants={item} className="flex flex-col items-center text-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Avatar className={cn(
                  "h-32 w-32 border-8 border-background shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-2", 
                  isHidden && "blur-2xl", 
                  isBlurred && "blur-lg"
                )}>
                  <AvatarImage src={isHidden ? undefined : targetPrivacyData?.photoURL} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white text-5xl font-[900] uppercase">{targetName[0]}</AvatarFallback>
                </Avatar>
                {isHidden && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Ghost className="h-12 w-12 text-rose-500 animate-pulse drop-shadow-lg" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 p-3 bg-primary rounded-2xl shadow-xl border-4 border-background">
                  <Fingerprint className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tight text-foreground">@{targetName}</h3>
                <div className="flex items-center justify-center gap-3">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3 h-6">
                    <Activity className="h-3 w-3 mr-1.5" /> Synchronized
                  </Badge>
                  {isHidden && (
                    <Badge variant="destructive" className="border-none text-[10px] font-black uppercase tracking-widest px-3 h-6">
                      <Lock className="h-3 w-3 mr-1.5" /> Encrypted
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Intelligence Grid */}
            <div className="grid grid-cols-2 gap-5">
              <motion.div variants={item} className="p-6 bg-muted/30 rounded-[2.5rem] border border-transparent hover:border-primary/20 transition-all group flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 p-8 opacity-0 group-hover:opacity-10 transition-opacity"><Globe className="h-16 w-16" /></div>
                <div className="flex items-center gap-2.5 text-primary">
                  <Compass className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verse Reach</span>
                </div>
                {isHidden ? <Lock className="h-5 w-5 text-muted-foreground/30" /> : <span className="text-3xl font-black text-foreground">{context?.totalCommunities || 0}</span>}
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Total Communities</p>
              </motion.div>

              <motion.div variants={item} className="p-6 bg-muted/30 rounded-[2.5rem] border border-transparent hover:border-primary/20 transition-all group flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 p-8 opacity-0 group-hover:opacity-10 transition-opacity"><Users className="h-16 w-16" /></div>
                <div className="flex items-center gap-2.5 text-primary">
                  <Waves className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mutual Sync</span>
                </div>
                {isHidden ? <Lock className="h-5 w-5 text-muted-foreground/30" /> : <span className="text-3xl font-black text-foreground">{context?.commonCommunities || 0}</span>}
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Shared Universes</p>
              </motion.div>

              <motion.div variants={item} className="p-6 bg-muted/30 rounded-[2.5rem] border border-transparent hover:border-primary/20 transition-all group flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2.5 text-primary">
                  <Milestone className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verse Age</span>
                </div>
                {isHidden ? <Lock className="h-5 w-5 text-muted-foreground/30" /> : <span className="text-xl font-black text-foreground truncate">{accountAge}</span>}
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Identity Longevity</p>
              </motion.div>

              <motion.div variants={item} className="p-6 bg-primary/10 rounded-[2.5rem] border border-primary/20 transition-all group flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2.5 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Security</span>
                </div>
                <span className="text-xl font-black text-primary uppercase">Grade AAA</span>
                <p className="text-[9px] text-primary/60 font-bold uppercase tracking-widest">Protocol Trust</p>
              </motion.div>
            </div>

            {/* Verse Trajectory Visualizer */}
            <motion.div variants={item} className="p-8 bg-card border rounded-[3rem] space-y-6 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary fill-primary" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Verse Trajectory</span>
                </div>
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase">Live Pulse Analytics</span>
              </div>
              
              <div className="h-24 w-full flex items-end gap-1 px-2 relative">
                {isHidden ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/20 backdrop-blur-sm rounded-2xl">
                    <Ghost className="h-8 w-8 text-primary/20 animate-pulse" />
                  </div>
                ) : (
                  [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.9, 1, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h * 100}%` }}
                      transition={{ delay: 0.5 + (i * 0.05), duration: 1, type: "spring" }}
                      className="flex-1 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors"
                    />
                  ))
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-center font-medium italic">
                {isHidden ? "Trajectory restricted by Protocol encryption." : "Consistent high-fidelity interaction detected across shared nodes."}
              </p>
            </motion.div>

            {/* Intelligence Footer Note */}
            <motion.div variants={item} className="p-8 bg-primary/5 rounded-[3rem] border border-primary/10 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-6 opacity-[0.03]"><Activity className="h-24 w-24 text-primary" /></div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center text-primary">
                  <Info className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Intelligence Verification</span>
              </div>
              <p className="text-base font-medium text-muted-foreground leading-relaxed relative z-10">
                {isHidden 
                  ? "Digital lineage context restricted. Identity has activated the 'Absolute Anonymity' protocol." 
                  : `Snapshot captured by @${senderName} at precisely ${context?.joinedAt ? new Date(context.joinedAt).toLocaleTimeString() : 'sync time'}. Data integrity verified by Verse node.`}
              </p>
            </motion.div>
          </motion.div>
        </ScrollArea>

        <div className="p-8 bg-muted/20 border-t flex items-center justify-center shrink-0">
          <CreatorFooter />
        </div>
      </DialogContent>
    </Dialog>
  );
}
