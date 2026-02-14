"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SendHorizontal, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

const COMMON_EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "🥰", "🥳", "😎", "🤔", "🤨",
  "👍", "👎", "🙌", "👏", "🔥", "✨", "❤️", "💔", "💯", "🎉",
  "🚀", "💡", "💻", "🎮", "🍕", "🍔", "☕️", "🍺", "🌈", "☀️",
  "🌙", "⚡️", "❄️", "🎈", "🎁", "📍", "🔔", "✅", "❌", "💬"
];

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
  };

  return (
    <div className="p-4 bg-white border-t shrink-0 w-full">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
        <Button variant="ghost" size="icon" type="button" className="shrink-0 text-muted-foreground hidden sm:flex">
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button" 
                  className="text-muted-foreground hover:text-primary transition-colors p-1"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-64 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="text-lg hover:bg-gray-100 rounded p-1 transition-colors flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
