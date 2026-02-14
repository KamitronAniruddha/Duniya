
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  status?: string;
}

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

export function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => doc(db, "users", message.senderId), [db, message.senderId]);
  const { data: sender } = useDoc(userRef);

  const timestamp = message.createdAt?.toDate() 
    ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "...";

  return (
    <div className={cn("flex w-full mb-4 group", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <Avatar className="h-8 w-8 mt-1 mr-2 shrink-0">
          <AvatarImage src={sender?.photoURL || ""} />
          <AvatarFallback>{sender?.username?.[0] || "?"}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
        {!isMe && (
          <span className="text-xs font-semibold mb-1 ml-1 text-muted-foreground">
            {sender?.username || "Loading..."}
          </span>
        )}
        
        <div className={cn(
          "px-4 py-2.5 rounded-2xl shadow-sm relative transition-all hover:shadow-md",
          isMe 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-white text-foreground rounded-tl-none border border-border"
        )}>
          <p className="text-sm leading-relaxed">{message.text}</p>
          
          <div className={cn(
            "flex items-center space-x-1 mt-1 text-[10px]",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span>{timestamp}</span>
            {isMe && (
              <span>
                <CheckCheck className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
