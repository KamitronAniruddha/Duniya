"use client";

import { useState, useRef, useEffect } from "react";
import { Message, MOCK_MESSAGES, MOCK_USERS, Channel, User } from "@/lib/mock-data";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { Hash, Phone, Video, Search, Pin, Users, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatWindowProps {
  channel: Channel;
  currentUser: User;
  onUpdateMessages: (messages: Message[]) => void;
}

export function ChatWindow({ channel, currentUser, onUpdateMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
    const updated = [...messages, newMessage];
    setMessages(updated);
    onUpdateMessages(updated);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      <header className="h-14 px-6 border-b flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2 overflow-hidden">
          <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="font-bold text-sm truncate">{channel.name}</h2>
          <div className="hidden sm:block h-4 w-px bg-border mx-2" />
          <p className="hidden sm:block text-xs text-muted-foreground truncate">{channel.topic || "Chatting in " + channel.name}</p>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
            <Video className="h-4 w-4" />
          </Button>
          <div className="hidden md:flex h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-primary">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-primary">
            <Users className="h-4 w-4" />
          </Button>
          <div className="relative hidden lg:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input 
              placeholder="Search" 
              className="bg-gray-100 rounded-md py-1 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-32 focus:w-48 transition-all"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-6">
        <div ref={scrollRef} className="py-6 max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center py-10 opacity-30">
             <div className="w-16 h-16 bg-gray-300 rounded-full mb-4 flex items-center justify-center">
                <Hash className="h-8 w-8" />
             </div>
             <h1 className="text-2xl font-bold text-foreground">Welcome to #{channel.name}</h1>
             <p className="text-sm mt-1">This is the beginning of the #{channel.name} channel.</p>
          </div>
          
          <div className="space-y-1 mt-8">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                sender={MOCK_USERS[msg.senderId]} 
                isMe={msg.senderId === currentUser.id} 
              />
            ))}
            <TypingIndicator />
          </div>
        </div>
      </ScrollArea>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}