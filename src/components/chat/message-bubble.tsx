
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser } from "@/firebase";
import { doc, arrayUnion, deleteField } from "firebase/firestore";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { Reply, CornerDownRight, Play, Pause, Volume2, MoreHorizontal, Trash2, Ban, Copy, Timer, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    text: string;
    type?: string;
    audioUrl?: string;
    videoUrl?: string;
    createdAt: any;
    isDeleted?: boolean;
    deletedBy?: string[];
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
  };
  channelId: string;
  serverId: string;
  sender?: any; // Received from parent for performance
  isMe: boolean;
  onReply?: () => void;
  onQuoteClick?: () => void;
}

export function MessageBubble({ message, channelId, serverId, sender, isMe, onReply, onQuoteClick }: MessageBubbleProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const swipeThreshold = 60;

  const [formattedTime, setFormattedTime] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isDisappeared, setIsDisappeared] = useState(false);

  // Format timestamp once
  useEffect(() => {
    if (message.createdAt) {
      const date = typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt.toDate?.() || new Date(message.createdAt);
      setFormattedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [message.createdAt]);

  // Handle viewing messages (Seen Status)
  useEffect(() => {
    if (!user || isMe || message.isDeleted || message.fullyDeleted) return;
    
    const hasSeen = message.seenBy?.includes(user.uid);
    if (!hasSeen && message.id) {
      const msgRef = doc(db, "communities", serverId, "channels", channelId, "messages", message.id);
      
      const updateData: any = {
        seenBy: arrayUnion(user.uid),
      };

      // Only set expiration if disappearing is enabled
      if (message.disappearingEnabled) {
        const now = new Date();
        const expireAt = new Date(now.getTime() + (message.disappearDuration || 10000)).toISOString();
        updateData[`viewerExpireAt.${user.uid}`] = expireAt;
      }
      
      updateDocumentNonBlocking(msgRef, updateData);
    }
  }, [message.id, user?.uid, isMe, message.disappearingEnabled, message.seenBy, db, serverId, channelId]);

  // Real-time Countdown logic
  useEffect(() => {
    if (!message.disappearingEnabled || !user || message.isDeleted || message.fullyDeleted) return;

    const timer = setInterval(() => {
      let expireAtStr: string | undefined;
      
      if (isMe) {
        expireAtStr = message.senderExpireAt;
      } else {
        expireAtStr = message.viewerExpireAt?.[user.uid];
      }

      if (expireAtStr) {
        const expireAt = new Date(expireAtStr);
        const now = new Date();
        const diff = expireAt.getTime() - now.getTime();
        
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

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (message.isDeleted || isDisappeared) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    startX.current = clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || message.isDeleted || isDisappeared) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - startX.current;
    if (diff > 0) {
      const rubberBand = Math.pow(diff, 0.85);
      setDragX(Math.min(rubberBand * 2, 100));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragX >= swipeThreshold) {
      onReply?.();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10);
    }
    setDragX(0);
    setIsDragging(false);
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsVideoPlaying(!isVideoPlaying);
  };

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    toast({ title: "Copied" });
  };

  const handleDeleteForEveryone = () => {
    if (!db || !serverId || !channelId || !message.id) return;
    const msgRef = doc(db, "communities", serverId, "channels", channelId, "messages", message.id);
    updateDocumentNonBlocking(msgRef, {
      isDeleted: true,
      content: "This message was deleted",
      audioUrl: deleteField(),
      videoUrl: deleteField(),
      type: "text"
    });
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (message.isDeleted || isDisappeared || message.fullyDeleted) {
    return (
      <div className={cn("flex w-full py-0.5 group items-end", isMe ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("flex flex-col max-w-[75%] relative", isMe ? "items-end" : "items-start")}>
          <div className={cn(
            "px-3 py-2 rounded-2xl text-[11px] italic opacity-60 flex items-center gap-2 border shadow-none",
            isMe ? "bg-muted/50 rounded-br-none" : "bg-card rounded-bl-none"
          )}>
            <Ban className="h-3 w-3" />
            {isDisappeared ? "This message disappeared" : (isMe ? "You deleted this message" : "This message was deleted")}
          </div>
        </div>
      </div>
    );
  }

  // Seen Status logic for UI
  const isSeenByOthers = (message.seenBy?.length || 0) > 0;

  return (
    <div 
      className={cn("flex w-full py-0.5 group items-end relative transition-colors duration-500 rounded-lg touch-none select-none", isMe ? "flex-row-reverse" : "flex-row")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-75 flex items-center justify-center bg-primary/10 rounded-full h-8 w-8 pointer-events-none" style={{ opacity: Math.min(dragX / swipeThreshold, 1), transform: `scale(${Math.min(dragX / swipeThreshold, 1)})`, left: `${Math.min(dragX / 2, 20)}px` }}>
        <Reply className={cn("h-4 w-4", dragX >= swipeThreshold ? "text-primary" : "text-muted-foreground")} />
      </div>

      {!isMe && (
        <UserProfilePopover userId={message.senderId}>
          <button className="h-8 w-8 mb-1 mr-2 shrink-0"><Avatar className="h-full w-full"><AvatarImage src={sender?.photoURL || undefined} /><AvatarFallback className="text-[10px] font-bold bg-primary text-white">{sender?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback></Avatar></button>
        </UserProfilePopover>
      )}
      
      <div className={cn("flex flex-col max-w-[75%] relative transition-transform ease-out", isMe ? "items-end" : "items-start")} style={{ transform: `translateX(${dragX}px)` }}>
        {!isMe && (
          <UserProfilePopover userId={message.senderId}>
            <button className="text-[10px] font-bold text-muted-foreground ml-1 mb-0.5 hover:text-primary transition-colors">{sender?.username || "..."}</button>
          </UserProfilePopover>
        )}
        
        <div className={cn(
          "px-3 py-2 rounded-2xl shadow-sm transition-shadow group-hover:shadow-md relative",
          message.disappearingEnabled && "ring-2 ring-primary/20",
          isMe ? "bg-primary text-white rounded-br-none" : "bg-card text-foreground rounded-bl-none border border-border"
        )}>
          {message.replyTo && (
            <button onClick={onQuoteClick} className={cn("w-full text-left mb-2 p-2 rounded-lg border-l-4 text-xs bg-black/5 flex flex-col gap-0.5", isMe ? "border-white/30" : "border-primary/50")}>
              <span className={cn("font-bold text-[10px] flex items-center gap-1", isMe ? "text-white/80" : "text-primary")}><CornerDownRight className="h-3 w-3" />{message.replyTo.senderName}</span>
              <p className={cn("line-clamp-2 italic", isMe ? "text-white/70" : "text-muted-foreground")}>{message.replyTo.text}</p>
            </button>
          )}

          {message.type === 'media' && message.audioUrl ? (
            <div className="flex items-center gap-3 py-1 min-w-[220px]">
              <audio ref={audioRef} src={message.audioUrl} preload="metadata" onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                  setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                }
              }} onLoadedMetadata={() => {
                if (audioRef.current) setDuration(audioRef.current.duration);
              }} />
              <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", isMe ? "text-white" : "text-primary")} onClick={togglePlay}>
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </Button>
              <div className="flex-1 space-y-1.5">
                <div className={cn("h-1.5 w-full rounded-full overflow-hidden relative", isMe ? "bg-white/30" : "bg-muted")}>
                  <div className={cn("h-full transition-all duration-300 ease-linear", isMe ? "bg-white" : "bg-primary")} style={{ width: `${progress}%` }} />
                </div>
                <div className={cn("text-[10px] font-mono font-bold flex items-center gap-1", isMe ? "text-white/80" : "text-primary")}>
                  <Volume2 className="h-3 w-3" />{formatAudioTime(isPlaying ? currentTime : duration)}
                </div>
              </div>
            </div>
          ) : message.type === 'media' && message.videoUrl ? (
            <div className="relative group/video overflow-hidden rounded-xl aspect-square w-64 md:w-80 shadow-inner bg-black">
              <video ref={videoRef} src={message.videoUrl} className="w-full h-full object-cover" loop muted={!isVideoPlaying} autoPlay playsInline onClick={toggleVideoPlay} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                 {isVideoPlaying ? <Volume2 className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white" />}
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">{message.text}</p>
          )}

          <div className="flex items-center justify-between gap-4 mt-1">
            {message.disappearingEnabled && (
              <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter", isMe ? "bg-white/10 text-white" : "bg-primary/10 text-primary")}>
                <Timer className="h-2.5 w-2.5" />
                {timeRemaining !== null ? (
                  <span>Disappears in {formatCountdown(timeRemaining)}</span>
                ) : (
                  <span>Waiting to be viewed</span>
                )}
              </div>
            )}
            <div className={cn("text-[9px] leading-none font-black ml-auto flex items-center gap-1", isMe ? "text-white" : "text-muted-foreground")}>
              {formattedTime}
              {isMe && (
                <div className="flex items-center">
                  {isSeenByOthers ? (
                    <CheckCheck className="h-4 w-4 text-[#00E0FF] drop-shadow-[0_0_2px_rgba(0,224,255,0.6)] animate-in zoom-in duration-300" />
                  ) : (
                    <Check className="h-4 w-4 text-white/70" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={cn("mb-2 mx-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5", isMe ? "mr-1" : "ml-1")}>
        <button onClick={onReply} className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"><Reply className="h-3.5 w-3.5 text-muted-foreground" /></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"><MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align={isMe ? "end" : "start"}>
            <DropdownMenuItem onClick={handleCopy}><Copy className="h-4 w-4 mr-2" />Copy</DropdownMenuItem>
            {isMe && <DropdownMenuItem onClick={handleDeleteForEveryone} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete for everyone</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
