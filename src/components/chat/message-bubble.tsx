
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
  };
  isMe: boolean;
}

export function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => doc(db, "users", message.senderId), [db, message.senderId]);
  const { data: sender } = useDoc(userRef);

  const timestamp = message.createdAt?.toDate() 
    ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "";

  return (
    <div className={cn("flex w-full py-1 group", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <Avatar className="h-8 w-8 mt-0.5 mr-2 shrink-0">
          <AvatarImage src={sender?.photoURL} />
          <AvatarFallback className="text-[10px]">{sender?.username?.[0] || "?"}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
        {!isMe && (
          <span className="text-[11px] font-bold text-muted-foreground ml-1 mb-0.5">
            {sender?.username || "Loading..."}
          </span>
        )}
        
        <div className={cn(
          "px-3.5 py-2 rounded-2xl text-sm shadow-sm transition-shadow hover:shadow-md",
          isMe 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-white text-foreground rounded-tl-none border border-border"
        )}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          <div className={cn(
            "text-[9px] mt-1 text-right leading-none",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}
