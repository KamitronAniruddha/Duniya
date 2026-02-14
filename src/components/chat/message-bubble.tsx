
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { Reply, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
    replyTo?: {
      messageId: string;
      senderName: string;
      text: string;
    };
  };
  isMe: boolean;
  onReply?: () => void;
  onQuoteClick?: (messageId: string) => void;
}

export function MessageBubble({ message, isMe, onReply, onQuoteClick }: MessageBubbleProps) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => doc(db, "users", message.senderId), [db, message.senderId]);
  const { data: sender } = useDoc(userRef);

  const timestamp = message.createdAt?.toDate() 
    ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "";

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
      
      <div className={cn("flex flex-col max-w-[70%] relative", isMe ? "items-end" : "items-start")}>
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
            ? "bg-primary text-primary-foreground rounded-br-none" 
            : "bg-white text-foreground rounded-bl-none border border-border"
        )}>
          {/* Reply Reference (Quoted Message) */}
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

          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
          <div className={cn(
            "text-[9px] mt-1 text-right leading-none opacity-70",
            isMe ? "text-primary-foreground" : "text-muted-foreground"
          )}>
            {timestamp}
          </div>
        </div>
      </div>

      {/* Reply Action Button */}
      <div className={cn(
        "mb-2 mx-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center",
        isMe ? "mr-1" : "ml-1"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full hover:bg-gray-100"
          onClick={onReply}
        >
          <Reply className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
