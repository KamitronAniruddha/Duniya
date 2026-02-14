import { cn } from "@/lib/utils";
import { Message, User } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  sender: User;
  isMe: boolean;
}

export function MessageBubble({ message, sender, isMe }: MessageBubbleProps) {
  return (
    <div className={cn("flex w-full mb-4 group", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <Avatar className="h-8 w-8 mt-1 mr-2 shrink-0">
          <AvatarImage src={sender.avatar} />
          <AvatarFallback>{sender.name[0]}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
        {!isMe && (
          <span className="text-xs font-semibold mb-1 ml-1 text-muted-foreground">{sender.name}</span>
        )}
        
        <div className={cn(
          "px-4 py-2.5 rounded-2xl shadow-sm relative transition-all hover:shadow-md",
          isMe 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-white text-foreground rounded-tl-none border border-border"
        )}>
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          <div className={cn(
            "flex items-center space-x-1 mt-1 text-[10px]",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span>{message.timestamp}</span>
            {isMe && (
              <span>
                {message.status === 'read' ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>

          {/* Hidden Action Toolbar - Visible on Hover */}
          <div className={cn(
            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white border shadow-md rounded-lg flex items-center px-2 py-1 space-x-2 -mt-4",
            isMe ? "right-0" : "left-0"
          )}>
             <button className="text-xs hover:bg-gray-100 p-1 rounded">Reply</button>
             <button className="text-xs hover:bg-gray-100 p-1 rounded">React</button>
          </div>
        </div>
      </div>
    </div>
  );
}