"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Smile, SendHorizontal, Mic, Image as ImageIcon, Paperclip } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    <div className="p-4 bg-white border-t border-border">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2 max-w-6xl mx-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuItem className="flex items-center py-2">
              <ImageIcon className="h-4 w-4 mr-2" />
              Upload Image
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center py-2">
              <Paperclip className="h-4 w-4 mr-2" />
              Attach File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 group">
          <Input 
            ref={inputRef}
            placeholder="Type a message..." 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="pr-12 py-6 rounded-2xl bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
               <Smile className="h-5 w-5" />
             </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {text.trim() ? (
            <Button type="submit" size="icon" className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 transition-all scale-110 shadow-lg">
              <SendHorizontal className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:bg-gray-100">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}