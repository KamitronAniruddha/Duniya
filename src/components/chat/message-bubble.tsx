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

export interface ForwardHop {
  communityName: string;
  channelName: string;
  viaCommunity?: string;
  viaChannel?: string;
  senderName: string;
  timestamp: string;
  isInitial?: boolean;
}

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    senderName?: string;
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
    deletedFor?: string[];
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Interaction logic
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 400;

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
      const updateData: any = { seenBy: arrayUnion(user.uid) };
      if (message.disappearingEnabled) {
        const expireAt = new Date(Date.now() + (message.disappearDuration || 10000)).toISOString();
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
    if (selectionMode) return;
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
    if (!isDragging || selectionMode) return;
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

  const isActuallyDeleted = message.isDeleted || isDisappeared || message.fullyDeleted;
  const latestHop = message.forwardingChain?.[message.forwardingChain.length - 1];

  return (
    <div 
      className={cn(
        "flex w-full py-0.5 group items-end relative transition-colors duration-200 rounded-2xl select-none", 
        isMe ? "flex-row-reverse" : "flex-row",
        isSelected && "bg-primary/10 shadow-inner"
      )}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onClick={(e) => {
        if (selectionMode) {
          e.stopPropagation();
          onSelect?.(message.id);
        }
      }}
    >
      <div className={cn(
        "shrink-0 flex items-center justify-center transition-all duration-200 overflow-hidden",
        selectionMode ? "w-10 opacity-100" : "w-0 opacity-0",
        isMe ? "ml-1" : "mr-1"
      )}>
        <motion.div 
          animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
            isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/20"
          )}
        >
          {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
        </motion.div>
      </div>

      <AnimatePresence>
        {dragX >= 60 && !isActuallyDeleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-primary/20 rounded-full h-8 w-8 flex items-center justify-center pointer-events-none z-10 backdrop-blur-sm shadow-lg"
          >
            <Reply className="h-4 w-4 text-primary" />
          </motion.div>
        )}
      </AnimatePresence>

      {!isMe && !selectionMode && (
        <UserProfilePopover userId={message.senderId}>
          <button className="h-8 w-8 mb-0.5 mr-2 shrink-0 transition-transform active:scale-90">
            <Avatar className="h-full w-full border border-border shadow-sm">
              <AvatarImage src={sender?.photoURL} />
              <AvatarFallback className="text-[9px] font-black bg-primary text-white">{sender?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
          </button>
        </UserProfilePopover>
      )}
      
      <motion.div 
        layout
        className={cn("flex flex-col max-w-[75%] relative transition-all duration-200 ease-out", isMe ? "items-end" : "items-start")} 
        style={{ x: dragX }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {isActuallyDeleted ? (
          <div className={cn(
            "px-4 py-2 rounded-[1.25rem] text-[10px] font-bold italic opacity-60 flex items-center gap-2 border shadow-none bg-card/50 backdrop-blur-sm",
            isMe ? "rounded-br-none" : "rounded-bl-none"
          )}>
            <Ban className="h-3.5 w-3.5" />
            {isDisappeared ? "This message vanished" : (isMe ? "You deleted this message" : "This message was deleted")}
          </div>
        ) : (
          <>
            {!isMe && !selectionMode && (
              <UserProfilePopover userId={message.senderId}>
                <button className="text-[9px] font-black text-muted-foreground/60 ml-1 mb-0.5 hover:text-primary uppercase tracking-widest transition-colors">{sender?.username || "..."}</button>
              </UserProfilePopover>
            )}
            
            <div className={cn(
              "px-3 py-2 rounded-[1.25rem] shadow-sm transition-all duration-200 relative group/bubble",
              isMe ? "bg-primary text-white rounded-br-none shadow-primary/10" : "bg-card text-foreground rounded-bl-none border border-border shadow-black/5",
              selectionMode && "cursor-pointer active:scale-[0.98]"
            )}>
              {message.isForwarded && (
                <div className={cn("flex flex-col mb-1.5 opacity-80", isMe ? "items-end" : "items-start")}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsTraceOpen(true); }} 
                    className={cn(
                      "flex items-center gap-1 italic text-[8px] font-black uppercase tracking-widest transition-all", 
                      isMe ? "text-white/90" : "text-muted-foreground"
                    )}
                  >
                    <Forward className="h-2 w-2" /> Forwarded
                  </button>
                  {latestHop && (
                    <div className={cn("flex items-center gap-1 text-[7px] font-black tracking-tight mt-0.5 opacity-60", isMe ? "text-white" : "text-primary")}>
                      <Landmark className="h-2 w-2" />
                      <span>{latestHop.communityName?.toUpperCase() || "VERSE"} {' > '} #{latestHop.channelName?.toUpperCase() || "GENERAL"}</span>
                    </div>
                  )}
                </div>
              )}

              {message.replyTo && (
                <button className={cn("w-full text-left mb-2 p-2 rounded-xl border-l-2 text-[11px] bg-black/5 flex flex-col gap-0.5 backdrop-blur-sm transition-colors", isMe ? "border-white/40" : "border-primary/50")}>
                  <span className={cn("font-black text-[9px] flex items-center gap-1 uppercase tracking-wider", isMe ? "text-white" : "text-primary")}>
                    <CornerDownRight className="h-3 w-3" />{(message.replyTo as any).senderName}
                  </span>
                  <p className={cn("line-clamp-1 italic font-medium", isMe ? "text-white/70" : "text-muted-foreground")}>{(message.replyTo as any).text}</p>
                </button>
              )}

              {message.type === 'media' && message.audioUrl ? (
                <div className="flex items-center gap-3 py-1 min-w-[200px]">
                  <audio ref={audioRef} src={message.audioUrl} onTimeUpdate={() => audioRef.current && setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)} />
                  <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full shadow-md", isMe ? "bg-white/10 text-white" : "bg-primary/10 text-primary")} onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
                  </Button>
                  <div className="flex-1 space-y-1.5">
                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isMe ? "bg-white/20" : "bg-muted")}>
                      <div className={cn("h-full", isMe ? "bg-white" : "bg-primary")} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              ) : message.type === 'media' && message.videoUrl ? (
                <div className="relative group/video overflow-hidden rounded-2xl aspect-square w-56 md:w-64 bg-black shadow-xl">
                  <video ref={videoRef} src={message.videoUrl} className="w-full h-full object-cover" loop muted={!isVideoPlaying} autoPlay playsInline onClick={(e) => { e.stopPropagation(); setIsVideoPlaying(!isVideoPlaying); }} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-snug text-sm font-medium tracking-tight selection:bg-white/30">{message.content}</p>
              )}

              <div className="flex items-center justify-between gap-3 mt-1.5">
                {message.disappearingEnabled && (
                  <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border shadow-sm", isMe ? "bg-white/10 border-white/20 text-white" : "bg-primary/10 border-primary/20 text-primary")}>
                    <Timer className="h-2.5 w-2.5 animate-pulse" />
                    {timeRemaining !== null ? <span>{timeRemaining}S</span> : <span>...</span>}
                  </div>
                )}
                <div className={cn("text-[8px] font-black ml-auto flex items-center gap-1 tracking-widest opacity-60", isMe ? "text-white" : "text-muted-foreground")}>
                  {formattedTime}
                  {isMe && (
                    <div className="flex items-center">
                      {message.seenBy && message.seenBy.length > 0 ? (
                        <CheckCheck className="h-3 w-3 text-cyan-400" />
                      ) : (
                        <Check className="h-3 w-3 text-white/40" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {!selectionMode && !isActuallyDeleted && (
        <div className={cn("mb-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1", isMe ? "mr-1 flex-row-reverse" : "ml-1 flex-row")}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsForwardOpen(true); }} 
            className="h-7 w-7 rounded-full bg-muted/30 hover:bg-primary hover:text-white flex items-center justify-center text-muted-foreground transition-colors active:scale-90"
          >
            <Forward className="h-3.5 w-3.5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-full bg-muted/30 hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors active:scale-90">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-xl font-black uppercase text-[9px] tracking-widest p-1 border-none shadow-xl bg-popover/95 backdrop-blur-md">
              <DropdownMenuItem onClick={() => onReply?.()} className="gap-2 p-2 rounded-lg">
                <Reply className="h-3 w-3 text-primary" /> Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Copied" }); }} className="gap-2 p-2 rounded-lg">
                <Copy className="h-3 w-3 text-primary" /> Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsForwardOpen(true)} className="gap-2 p-2 rounded-lg">
                <Forward className="h-3 w-3 text-primary" /> Forward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive gap-2 p-2 rounded-lg">
                <Trash2 className="h-3 w-3" /> Delete
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
        onDeleteForMe={() => {
          if (!db || !messagePath || !user) return;
          updateDocumentNonBlocking(doc(db, messagePath), { deletedFor: arrayUnion(user.uid) });
          toast({ title: "Removed Locally" });
        }} 
        onDeleteForEveryone={() => {
          if (!db || !messagePath) return;
          updateDocumentNonBlocking(doc(db, messagePath), {
            isDeleted: true,
            content: "This message was deleted",
            audioUrl: deleteField(),
            videoUrl: deleteField(),
            type: "text"
          });
          toast({ title: "Wiped" });
        }} 
        isSender={isMe} 
      />
    </div>
  );
});
