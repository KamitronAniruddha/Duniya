
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SendHorizontal, Smile, History, Ghost, X, CornerDownRight, Mic, Square, Trash2, Video, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface MessageInputProps {
  onSendMessage: (content: string, audioUrl?: string, videoUrl?: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  replyingTo?: any | null;
  onCancelReply?: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: "recent",
    icon: <History className="h-4 w-4" />,
    label: "Recent",
    emojis: []
  },
  {
    id: "smileys",
    icon: <Smile className="h-4 w-4" />,
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"]
  },
  {
    id: "animals",
    icon: <Ghost className="h-4 w-4" />,
    label: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🕸", "蠍", "🐢", "🐍", "🦎", "REX", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", " leopards", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"]
  }
];

export function MessageInput({ onSendMessage, inputRef, replyingTo, onCancelReply }: MessageInputProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const replyUserRef = useMemoFirebase(() => (replyingTo ? doc(db, "users", replyingTo.senderId) : null), [db, replyingTo?.senderId]);
  const { data: replyUser } = useDoc(replyUserRef);

  useEffect(() => {
    const saved = localStorage.getItem("recent-emojis");
    if (saved) {
      try {
        setRecentEmojis(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent emojis");
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 40);
    setRecentEmojis(updated);
    localStorage.setItem("recent-emojis", JSON.stringify(updated));
  };

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });

      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          onSendMessage("", reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Error", description: "Could not access microphone." });
    }
  };

  // Video Recording Logic
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 480, height: 480, facingMode: "user" },
        audio: true 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          onSendMessage("", undefined, reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecordingVideo(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera for video message." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isRecordingVideo)) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingVideo(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isRecordingVideo)) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsRecordingVideo(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white shrink-0 w-full flex flex-col">
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
            <CornerDownRight className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Replying to {replyUser?.username || "..."}</span>
            <p className="text-xs text-muted-foreground truncate italic">{replyingTo.text || (replyingTo.audioUrl ? "Voice Message" : "Video Message")}</p>
          </div>
          <button onClick={onCancelReply} className="h-6 w-6 rounded-full hover:bg-gray-200 flex items-center justify-center">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="p-4 bg-white border-t relative">
        {(isRecording || isRecordingVideo) ? (
          <div className="flex items-center gap-4 max-w-5xl mx-auto bg-gray-50 p-2 rounded-xl animate-in fade-in zoom-in-95">
            {isRecordingVideo && (
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary bg-black shrink-0 relative shadow-lg">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="h-full w-full object-cover scale-x-[-1]" 
                />
                <div className="absolute inset-0 border-[6px] border-white/10 pointer-events-none rounded-full" />
                <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
            )}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full w-fit">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold">{formatTime(recordingTime)}</span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {isRecordingVideo ? "Video Message" : "Audio Message"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-medium italic">
                {isRecordingVideo ? "Recording your circle Verse..." : "Recording clear audio..."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" 
                onClick={cancelRecording}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button 
                size="icon" 
                className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg text-white transition-transform hover:scale-105" 
                onClick={stopRecording}
              >
                <Square className="h-5 w-5 fill-current" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
            <Button variant="ghost" size="icon" type="button" className="shrink-0 text-muted-foreground hidden sm:flex">
              <Plus className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 relative">
              <input 
                ref={inputRef}
                placeholder={replyingTo ? "Write a reply..." : "Write a message..."}
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
                    <button type="button" className="text-muted-foreground hover:text-primary transition-colors p-1">
                      <Smile className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-80 p-0 overflow-hidden">
                    <Tabs defaultValue="smileys" className="w-full">
                      <TabsList className="w-full justify-start rounded-none border-b bg-gray-50/50 p-0 h-10">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <TabsTrigger key={cat.id} value={cat.id} className="flex-1 rounded-none data-[state=active]:bg-white">
                            {cat.icon}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {EMOJI_CATEGORIES.map((cat) => (
                        <TabsContent key={cat.id} value={cat.id} className="m-0">
                          <ScrollArea className="h-64 p-2">
                            <div className="grid grid-cols-8 gap-1">
                              {(cat.id === 'recent' ? recentEmojis : cat.emojis).map((emoji, idx) => (
                                <button key={idx} type="button" onClick={() => addEmoji(emoji)} className="text-xl hover:bg-gray-100 rounded aspect-square flex items-center justify-center">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {text.trim() ? (
                <Button type="submit" size="icon" className="rounded-xl h-10 w-10 shrink-0 bg-primary text-white shadow-md">
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" size="icon" onClick={startVideoRecording} className="rounded-xl h-10 w-10 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button type="button" size="icon" onClick={startRecording} className="rounded-xl h-10 w-10 shrink-0 bg-gray-100 text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm">
                    <Mic className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
