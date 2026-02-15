"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SendHorizontal, Smile, History, Ghost, X, CornerDownRight, Mic, Square, Trash2, Video, Timer, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface MessageInputProps {
  onSendMessage: (content: string, audioUrl?: string, videoUrl?: string, replySenderName?: string, disappearing?: DisappearingConfig) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  replyingTo?: any | null;
  onCancelReply?: () => void;
}

interface DisappearingConfig {
  enabled: boolean;
  duration: number;
}

const DISAPPEAR_OPTIONS = [
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "1m", value: 60000 },
  { label: "5m", value: 300000 },
  { label: "1h", value: 3600000 },
  { label: "24h", value: 86400000 },
  { label: "Custom", value: -1 },
];

const EMOJI_CATEGORIES = [
  { id: "recent", icon: <History className="h-4 w-4" />, label: "Recent", emojis: [] },
  { id: "smileys", icon: <Smile className="h-4 w-4" />, label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"] },
  { id: "animals", icon: <Ghost className="h-4 w-4" />, label: "Animals", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🕸", "🐢", "🐍", "🦎", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🐐", "🦌", "🐕", "🐩", "🦮", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"] }
];

export function MessageInput({ onSendMessage, inputRef, replyingTo, onCancelReply }: MessageInputProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearDuration, setDisappearDuration] = useState(10000);
  const [customSeconds, setCustomSeconds] = useState("");

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
      const duration = disappearDuration === -1 ? (parseInt(customSeconds) || 10) * 1000 : disappearDuration;
      onSendMessage(text, undefined, undefined, replyUser?.username, {
        enabled: disappearingEnabled,
        duration: duration
      });
      setText("");
    }
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 40);
    setRecentEmojis(updated);
    localStorage.setItem("recent-emojis", JSON.stringify(updated));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 } 
      });
      const options = { audioBitsPerSecond: 128000, mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const duration = disappearDuration === -1 ? (parseInt(customSeconds) || 10) * 1000 : disappearDuration;
          onSendMessage("", reader.result as string, undefined, replyUser?.username, { enabled: disappearingEnabled, duration: duration });
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Error", description: "Could not access microphone." });
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const duration = disappearDuration === -1 ? (parseInt(customSeconds) || 10) * 1000 : disappearDuration;
          onSendMessage("", undefined, reader.result as string, replyUser?.username, { enabled: disappearingEnabled, duration: duration });
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecordingVideo(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera." });
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
    <div className="bg-background shrink-0 w-full flex flex-col font-body">
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-150">
          <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
            <CornerDownRight className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider">Replying to {replyUser?.username || "..."}</span>
            <p className="text-xs text-muted-foreground truncate italic font-medium">{replyingTo.content || replyingTo.text || "Media message"}</p>
          </div>
          <button onClick={onCancelReply} className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="p-4 bg-background border-t relative">
        {(isRecording || isRecordingVideo) ? (
          <div className="flex items-center gap-4 max-w-5xl mx-auto bg-muted/20 p-3 rounded-2xl animate-in fade-in zoom-in-95 border border-primary/10 shadow-xl">
            {isRecordingVideo && (
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary bg-black shrink-0 relative shadow-lg">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>
            )}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 text-red-500 rounded-full w-fit border border-red-500/20">
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-sm font-black font-mono">{formatTime(recordingTime)}</span>
                </div>
                <div className="flex-1 flex items-center gap-1.5 h-4 overflow-hidden">
                  {[...Array(12)].map((_, i) => (
                    <motion.div key={i} animate={{ height: [2, Math.random() * 12 + 2, 2] }} transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.1 }} className="w-1 bg-primary/40 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={cancelRecording}><Trash2 className="h-5 w-5" /></Button>
              <Button size="icon" className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/30 text-white transition-transform active:scale-90" onClick={stopRecording}>
                <Square className="h-6 w-6 fill-current" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-5xl mx-auto">
            {disappearingEnabled && (
              <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg animate-in slide-in-from-top-2 duration-150">
                <Timer className="h-4 w-4 text-primary animate-pulse" />
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">Disappearing Messages</span>
                  <Select value={disappearDuration.toString()} onValueChange={(val) => setDisappearDuration(parseInt(val))}>
                    <SelectTrigger className="h-7 text-[10px] w-24 bg-background border-primary/20">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISAPPEAR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value.toString()} className="text-[10px] font-bold">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {disappearDuration === -1 && (
                    <Input placeholder="Secs" className="h-7 w-16 text-[10px] p-1 font-bold" value={customSeconds} onChange={(e) => setCustomSeconds(e.target.value)} />
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDisappearingEnabled(false)}><X className="h-3 w-3" /></Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" type="button" className={cn("shrink-0 transition-colors rounded-xl", disappearingEnabled ? "text-primary bg-primary/10" : "text-muted-foreground")}>
                    <Clock className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-56 p-3 rounded-2xl border-none shadow-2xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase tracking-wider">Ghost Mode</Label>
                      <Button size="sm" variant={disappearingEnabled ? "default" : "outline"} className="h-6 text-[10px] font-black" onClick={() => setDisappearingEnabled(!disappearingEnabled)}>
                        {disappearingEnabled ? "ACTIVE" : "OFF"}
                      </Button>
                    </div>
                    {disappearingEnabled && <p className="text-[10px] text-muted-foreground leading-snug font-medium italic">Messages vanish after they are viewed by participants.</p>}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex-1 relative">
                <input 
                  ref={inputRef}
                  placeholder={replyingTo ? "Write a reply..." : "Karo Chutiyapaa..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-muted/40 border-none rounded-xl px-4 py-2.5 text-sm font-body font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground/50 tracking-tight"
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
                      <button type="button" className="text-muted-foreground hover:text-primary transition-colors p-1"><Smile className="h-4 w-4" /></button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-80 p-0 overflow-hidden bg-popover border-none shadow-2xl rounded-2xl">
                      <Tabs defaultValue="smileys" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0 h-10">
                          {EMOJI_CATEGORIES.map((cat) => (
                            <TabsTrigger key={cat.id} value={cat.id} className="flex-1 rounded-none data-[state=active]:bg-background">{cat.icon}</TabsTrigger>
                          ))}
                        </TabsList>
                        {EMOJI_CATEGORIES.map((cat) => (
                          <TabsContent key={cat.id} value={cat.id} className="m-0">
                            <ScrollArea className="h-64 p-2">
                              <div className="grid grid-cols-8 gap-1">
                                {(cat.id === 'recent' ? recentEmojis : cat.emojis).map((emoji, idx) => (
                                  <button key={idx} type="button" onClick={() => addEmoji(emoji)} className="text-xl hover:bg-muted rounded aspect-square flex items-center justify-center transition-transform active:scale-125">{emoji}</button>
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
                  <Button type="submit" size="icon" className="rounded-xl h-10 w-10 shrink-0 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-90">
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="ghost" size="icon" onClick={startVideoRecording} className="rounded-xl h-10 w-10 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"><Video className="h-5 w-5" /></Button>
                    <Button type="button" size="icon" onClick={startRecording} className="rounded-xl h-10 w-10 shrink-0 bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95"><Mic className="h-5 w-5" /></Button>
                  </>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
