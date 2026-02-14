
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, arrayUnion } from "firebase/firestore";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { Reply, CornerDownRight, Play, Pause, Volume2, MoreHorizontal, Trash2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    text: string;
    type?: string;
    audioUrl?: string;
    createdAt: any;
    isDeleted?: boolean;
    deletedBy?: string[];
    replyTo?: {
      messageId: string;
      senderName: string;
      text: string;
    };
  };
  channelId: string;
  isMe: boolean;
  onReply?: () => void;
  onQuoteClick?: (messageId: string) => void;
}

export function MessageBubble({ message, channelId, isMe, onReply, onQuoteClick }: MessageBubbleProps) {
  const db = useFirestore();
  const { user } = useUser();
  const userRef = useMemoFirebase(() => doc(db, "users", message.senderId), [db, message.senderId]);
  const { data: sender } = useDoc(userRef);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timestamp = message.createdAt?.toDate
    ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "";

  const formatAudioTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleDeleteForEveryone = () => {
    if (!db || !channelId || !message.id) return;
    const msgRef = doc(db, "messages", channelId, "chatMessages", message.id);
    updateDocumentNonBlocking(msgRef, {
      isDeleted: true,
      text: "This message was deleted",
      audioUrl: null,
      type: "text"
    });
  };

  const handleDeleteForMe = () => {
    if (!db || !channelId || !message.id || !user) return;
    const msgRef = doc(db, "messages", channelId, "chatMessages", message.id);
    updateDocumentNonBlocking(msgRef, {
      deletedBy: arrayUnion(user.uid)
    });
  };

  if (message.isDeleted) {
    return (
      <div 
        id={`message-${message.id}`}
        className={cn(
          "flex w-full py-0.5 group items-end", 
          isMe ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div className={cn("flex flex-col max-w-[75%] relative", isMe ? "items-end" : "items-start")}>
          <div className={cn(
            "px-3 py-2 rounded-2xl text-xs italic opacity-60 flex items-center gap-2 border shadow-none",
            isMe ? "bg-gray-100 rounded-br-none" : "bg-white rounded-bl-none"
          )}>
            <Ban className="h-3 w-3" />
            {isMe ? "You deleted this message" : "This message was deleted"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`message-${message.id}`}
      className={cn(
        "flex w-full py-0.5 group items-end transition-colors duration-500 rounded-lg", 
        isMe ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isMe && (
        <UserProfilePopover userId={message.senderId}>
          <button className="h-8 w-8 mb-1 mr-2 shrink-0 transition-transform hover:scale-105">
            <Avatar className="h-full w-full shadow-sm border border-border">
              <AvatarImage src={sender?.photoURL || undefined} />
              <AvatarFallback className="text-[10px] font-bold bg-primary text-white">
                {sender?.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </button>
        </UserProfilePopover>
      )}
      
      <div className={cn("flex flex-col max-w-[75%] relative", isMe ? "items-end" : "items-start")}>
        {!isMe && (
          <UserProfilePopover userId={message.senderId}>
            <button className="text-[10px] font-bold text-muted-foreground ml-1 mb-0.5 hover:text-primary transition-colors">
              {sender?.username || "..."}
            </button>
          </UserProfilePopover>
        )}
        
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm shadow-sm transition-shadow group-hover:shadow-md relative",
          isMe 
            ? "bg-primary text-white rounded-br-none" 
            : "bg-white text-foreground rounded-bl-none border border-border"
        )}>
          {/* Reply Reference */}
          {message.replyTo && (
            <button 
              onClick={() => onQuoteClick?.(message.replyTo!.messageId)}
              className={cn(
                "w-full text-left mb-2 p-2 rounded-lg border-l-4 text-xs bg-black/5 flex flex-col gap-0.5 transition-opacity hover:opacity-80",
                isMe ? "border-white/30" : "border-primary/50"
              )}
            >
              <span className={cn(
                "font-bold text-[10px] flex items-center gap-1",
                isMe ? "text-white/80" : "text-primary"
              )}>
                <CornerDownRight className="h-3 w-3" />
                {message.replyTo.senderName}
              </span>
              <p className={cn(
                "line-clamp-2 italic",
                isMe ? "text-white/70" : "text-muted-foreground"
              )}>
                {message.replyTo.text}
              </p>
            </button>
          )}

          {message.type === 'voice' && message.audioUrl ? (
            <div className="flex items-center gap-3 py-1 min-w-[220px]">
              <audio ref={audioRef} src={message.audioUrl} preload="metadata" />
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-10 w-10 rounded-full shrink-0 flex items-center justify-center",
                  isMe ? "text-white hover:bg-white/20" : "text-primary hover:bg-primary/10"
                )}
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </Button>
              <div className="flex-1 space-y-1.5">
                <div className={cn(
                  "h-1.5 w-full rounded-full overflow-hidden relative",
                  isMe ? "bg-white/30" : "bg-gray-100"
                )}>
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 ease-linear",
                      isMe ? "bg-white" : "bg-primary"
                    )} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className={cn(
                    "text-[10px] font-mono font-bold flex items-center gap-1",
                    isMe ? "text-white/80" : "text-primary"
                  )}>
                    <Volume2 className="h-3 w-3" />
                    {formatAudioTime(isPlaying ? currentTime : duration)}
                  </div>
                  <div className={cn(
                    "text-[9px] font-medium tracking-tight",
                    isMe ? "text-white/60" : "text-muted-foreground"
                  )}>
                    Voice Message
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
          )}

          <div className={cn(
            "text-[9px] mt-1 text-right leading-none opacity-70 font-medium",
            isMe ? "text-white/80" : "text-muted-foreground"
          )}>
            {timestamp}
          </div>
        </div>
      </div>

      <div className={cn(
        "mb-2 mx-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5",
        isMe ? "mr-1" : "ml-1"
      )}>
        <button 
          onClick={onReply}
          className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          title="Reply"
        >
          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isMe ? "end" : "start"}>
            <DropdownMenuItem onClick={handleDeleteForMe} className="text-destructive font-medium">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete for me
            </DropdownMenuItem>
            {isMe && (
              <DropdownMenuItem onClick={handleDeleteForEveryone} className="text-destructive font-medium">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete for everyone
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
