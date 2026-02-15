
"use client";

import React, { memo, useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, arrayUnion, deleteField } from "firebase/firestore";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { Reply, CornerDownRight, Play, Pause, Volume2, MoreHorizontal, Trash2, Ban, Copy, Timer, Check, CheckCheck, Forward, Landmark, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { MessageTraceDialog } from "./message-trace-dialog";
import { ForwardDialog } from "./forward-dialog";
import { DeleteOptionsDialog } from "./delete-options-dialog";
import { motion, AnimatePresence } from "framer-motion";

interface ForwardHop {
  communityName: string;
  viaCommunity?: string;
  senderName: string;
  timestamp: string;
  isInitial?: boolean;
}

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    content: string;
    type?: string;
    audioUrl?: string;
    videoUrl?: string;
    sentAt: any;
    isDeleted?: boolean;
    replyTo?: {
      messageId: string;
      senderName: string;
      text: string;
    };
    disappearingEnabled?: boolean;
    disappearDuration?: number;
    senderExpireAt?: string;
    viewerExpireAt?: Record<string, string>;
    seenBy?: string[];
    fullyDeleted?: boolean;
    isForwarded?: boolean;
    forwardingChain?: ForwardHop[];
  };
  messagePath: string;
  isMe: boolean;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onReply?: () => void;
}

export const MessageBubble = memo(function MessageBubble({ 
  message, 
  messagePath,
  isMe, 
  isSelected, 
  selectionMode,
  onSelect,
  onLongPress,
  onReply
}: MessageBubbleProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const senderRef = useMemoFirebase(() => (message.senderId ? doc(db, "users", message.senderId) : null), [db, message.senderId]);
  const { data: sender } = useDoc(senderRef);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Swipe & Long Press logic
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 500;

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isDisappeared, setIsDisappeared] = useState(false);

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
      const updateData: any = { 
        seenBy: arrayUnion(user.uid) 
      };
      
      if (message.disappearingEnabled) {
        const now = new Date();
        const expireAt = new Date(now.getTime() + (message.disappearDuration || 10000)).toISOString();
        updateData[`viewerExpireAt.${user.uid}`] = expireAt;
      }
      
      updateDocumentNonBlocking(msgRef, updateData);
    }
  }, [message.id, user?.uid, isMe, messagePath, message.disappearingEnabled, message.seenBy]);

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
  }, [message.disappearingEnabled, message.senderExpireAt, message.viewerExpireAt, user?.uid, isMe]);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    startX.current = clientX;
    startY.current = clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);

    longPressTimer.current = setTimeout(() => {
      if (!selectionMode && onLongPress) {
        onLongPress(message.id);
        setIsDragging(false);
      }
    }, LONG_PRESS_DURATION);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const diffX = clientX - startX.current;
    const diffY = clientY - startY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > Math.abs(diffY)) isHorizontalSwipe.current = true;
      else if (Math.abs(diffY) > 5) {
        isHorizontalSwipe.current = false;
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        setIsDragging(false);
        return;
      }
    }

    if (isHorizontalSwipe.current && !selectionMode && diffX > 0 && !message.isDeleted && !isDisappeared) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      const rubberBand = Math.pow(diffX, 0.85);
      setDragX(Math.min(rubberBand * 2, 100));
    }
  };

  const handleEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!isDragging) return;
    if (dragX >= 60 && !selectionMode) onReply?.();
    setDragX(0);
    setIsDragging(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleDeleteForMe = () => {
    if (!db || !messagePath || !user) return;
    const msgRef = doc(db, messagePath);
    updateDocumentNonBlocking(msgRef, {
      deletedFor: arrayUnion(user.uid)
    });
    toast({ title: "Deleted for you" });
  };

  const handleDeleteForEveryone = () => {
    if (!db || !messagePath) return;
    const msgRef = doc(db, messagePath);
    updateDocumentNonBlocking(msgRef, {
      isDeleted: true,
      content: "This message was deleted",
      audioUrl: deleteField(),
      videoUrl: deleteField(),
      type: "text"
    });
    toast({ title: "Deleted for everyone" });
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isActuallyDeleted = message.isDeleted || isDisappeared || message.fullyDeleted;
  const latestHop = message.forwardingChain?.[message.forwardingChain.length - 1];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      className={cn(
        "flex w-full py-0.5 group items-end relative transition-all duration-300 rounded-lg select-none", 
        isMe ? "flex-row-reverse" : "flex-row",
        isSelected && "bg-primary/5 shadow-inner"
      )}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onClick={() => selectionMode && onSelect?.(message.id)}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center transition-all duration-300 overflow-hidden",
        selectionMode ? "w-10 opacity-100" : "w-0 opacity-0",
        isMe ? "ml-2" : "mr-2"
      )}>
        <div className={cn(
          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          isSelected ? "bg-primary border-primary text-white scale-110 shadow-lg" : "border-muted-foreground/40 scale-100"
        )}>
          {isSelected && <Check className="h-3 w-3 stroke-[4px]" />}
        </div>
      </div>

      <AnimatePresence>
        {dragX >= 60 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0, x: -20 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-primary/20 rounded-full h-8 w-8 flex items-center justify-center pointer-events-none z-10"
          >
            <Reply className="h-4 w-4 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      {!isMe && !selectionMode && (
        <UserProfilePopover userId={message.senderId}>
          <button className="h-8 w-8 mb-1 mr-2 shrink-0 transition-transform hover:scale-110">
            <Avatar className="h-full w-full border border-border shadow-sm">
              <AvatarImage src={sender?.photoURL} />
              <AvatarFallback className="text-[10px] font-bold bg-primary text-white">{sender?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
          </button>
        </UserProfilePopover>
      )}
      
      <div className={cn("flex flex-col max-w-[75%] relative transition-transform ease-out", isMe ? "items-end" : "items-start")} style={{ transform: `translateX(${dragX}px)` }}>
        {isActuallyDeleted ? (
          <motion.div 
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl text-[11px] italic opacity-60 flex items-center gap-2 border shadow-none bg-card",
              isMe ? "rounded-br-none" : "rounded-bl-none"
            )}
          >
            <Ban className="h-3 w-3" />
            {isDisappeared ? "This message disappeared" : (isMe ? "You deleted this message" : "This message was deleted")}
          </motion.div>
        ) : (
          <>
            {!isMe && !selectionMode && (
              <UserProfilePopover userId={message.senderId}>
                <button className="text-[10px] font-black text-muted-foreground ml-1 mb-0.5 hover:text-primary uppercase tracking-wider">{sender?.username || "..."}</button>
              </UserProfilePopover>
            )}
            
            <div className={cn(
              "px-3.5 py-2.5 rounded-2xl shadow-sm transition-all relative",
              isMe ? "bg-primary text-white rounded-br-none" : "bg-card text-foreground rounded-bl-none border border-border"
            )}>
              {message.isForwarded && (
                <div className={cn("flex flex-col mb-1.5 opacity-70", isMe ? "items-end" : "items-start")}>
                  <button onClick={(e) => { e.stopPropagation(); setIsTraceOpen(true); }} className={cn("flex items-center gap-1 italic text-[9px] font-black uppercase tracking-widest hover:text-primary transition-colors group/forward", isMe ? "text-white/90" : "text-muted-foreground")}>
                    <Forward className="h-2.5 w-2.5" /> Forwarded
                    <History className="h-2 w-2 ml-1" />
                  </button>
                  {latestHop && (
                    <div className={cn("flex items-center gap-1 text-[8px] font-bold tracking-tight mt-0.5", isMe ? "text-white/60" : "text-primary/70")}>
                      <Landmark className="h-2 w-2" />
                      <span>via {latestHop.communityName}</span>
                    </div>
                  )}
                </div>
              )}

              {message.replyTo && (
                <button className={cn("w-full text-left mb-2 p-2 rounded-lg border-l-4 text-xs bg-black/5 flex flex-col gap-0.5", isMe ? "border-white/40" : "border-primary/50")}>
                  <span className={cn("font-bold text-[10px] flex items-center gap-1 uppercase", isMe ? "text-white/90" : "text-primary")}>
                    <CornerDownRight className="h-3 w-3" />{(message.replyTo as any).senderName}
                  </span>
                  <p className={cn("line-clamp-2 italic", isMe ? "text-white/70" : "text-muted-foreground")}>{(message.replyTo as any).text}</p>
                </button>
              )}

              {message.type === 'media' && message.audioUrl ? (
                <div className="flex items-center gap-3 py-1 min-w-[220px]">
                  <audio ref={audioRef} src={message.audioUrl} onTimeUpdate={() => audioRef.current && (setCurrentTime(audioRef.current.currentTime), setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100))} onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} />
                  <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", isMe ? "text-white hover:bg-white/10" : "text-primary hover:bg-primary/10")} onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                  </Button>
                  <div className="flex-1 space-y-1.5">
                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isMe ? "bg-white/30" : "bg-muted")}>
                      <div className={cn("h-full transition-all duration-300", isMe ? "bg-white" : "bg-primary")} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              ) : message.type === 'media' && message.videoUrl ? (
                <div className="relative group/video overflow-hidden rounded-xl aspect-square w-64 md:w-80 bg-black/90">
                  <video ref={videoRef} src={message.videoUrl} className="w-full h-full object-cover" loop muted={!isVideoPlaying} autoPlay playsInline onClick={() => setIsVideoPlaying(!isVideoPlaying)} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-relaxed text-sm tracking-tight">{message.content}</p>
              )}

              <div className="flex items-center justify-between gap-4 mt-1.5">
                {message.disappearingEnabled && (
                  <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter", isMe ? "bg-white/10 text-white" : "bg-primary/10 text-primary")}>
                    <Timer className="h-2.5 w-2.5" />
                    {timeRemaining !== null ? <span>Vanish in {formatCountdown(timeRemaining)}</span> : <span>Waiting for view</span>}
                  </div>
                )}
                <div className={cn("text-[9px] font-black ml-auto flex items-center gap-1 tracking-widest", isMe ? "text-white/80" : "text-muted-foreground")}>
                  {formattedTime}
                  {isMe && (
                    <div className="flex items-center ml-0.5">
                      {message.seenBy && message.seenBy.length > 0 ? (
                        <CheckCheck className="h-3.5 w-3.5 text-[#00E0FF] drop-shadow-[0_0_4px_rgba(0,224,255,0.8)]" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-white/60" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!selectionMode && !isActuallyDeleted && (
        <div className={cn("mb-2 mx-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", isMe ? "mr-1 flex-row-reverse" : "ml-1 flex-row")}>
          <button onClick={() => setIsForwardOpen(true)} className="h-8 w-8 rounded-full bg-muted/40 hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-sm">
            <Forward className="h-4 w-4" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-sm">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-1 border-none shadow-xl">
              <DropdownMenuItem onClick={() => { onReply?.(); }} className="gap-2 p-2 rounded-lg">
                <Reply className="h-4 w-4" /> Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Copied" }); }} className="gap-2 p-2 rounded-lg">
                <Copy className="h-4 w-4" /> Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsForwardOpen(true)} className="gap-2 p-2 rounded-lg">
                <Forward className="h-4 w-4" /> Forward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive gap-2 p-2 rounded-lg hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {message.forwardingChain && (
        <MessageTraceDialog open={isTraceOpen} onOpenChange={setIsTraceOpen} chain={message.forwardingChain} />
      )}
      
      <ForwardDialog 
        open={isForwardOpen} 
        onOpenChange={setIsForwardOpen} 
        messagesToForward={[message]} 
      />

      <DeleteOptionsDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        onDeleteForMe={handleDeleteForMe} 
        onDeleteForEveryone={handleDeleteForEveryone} 
        isSender={isMe} 
      />
    </motion.div>
  );
});
