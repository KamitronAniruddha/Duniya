
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SendHorizontal, Smile } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    <div className="p-4 bg-white border-t shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
        <Button variant="ghost" size="icon" type="button" className="shrink-0 text-muted-foreground">
          <Plus className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 relative">
          <input 
            placeholder="Write a message..." 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
            <Smile className="h-4 w-4" />
          </button>
        </div>

        <Button 
          type="submit" 
          size="icon" 
          disabled={!text.trim()}
          className={cn(
            "rounded-xl h-10 w-10 shrink-0 transition-all",
            text.trim() ? "bg-primary shadow-md scale-100" : "bg-gray-200 text-gray-400 scale-95"
          )}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

import { cn } from "@/lib/utils";
