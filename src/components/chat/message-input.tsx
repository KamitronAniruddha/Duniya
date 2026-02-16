
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SendHorizontal, Smile, History, Ghost, X, CornerDownRight, Mic, Square, Trash2, Video, Timer, Clock, Image as ImageIcon, Loader2, Paperclip, FileText, Bold, Italic, Type, TypeOutline, Eraser, Command, User as UserIcon, Reply, Camera, Globe, Users, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileReplyTarget {
  id: string;
  username: string;
  photoURL: string;
  bio?: string;
  totalCommunities: number;
  commonCommunities: number;
}

interface MessageInputProps {
  onSendMessage: (
    content: string, 
    audioUrl?: string, 
    videoUrl?: string, 
    replySenderName?: string, 
    disappearing?: DisappearingConfig, 
    imageUrl?: string,
    file?: { url: string; name: string; type: string },
    whisperTarget?: { id: string; username: string } | null,
    replySenderPhotoURL?: string,
    isProfileReply?: boolean,
    profileContext?: any
  ) => void;
  onExecuteCommand?: (cmd: string, args: string[]) => Promise<boolean>;
  inputRef?: React.RefObject<HTMLInputElement>;
  replyingTo?: any | null;
  onCancelReply?: () => void;
  profileReplyTarget?: ProfileReplyTarget | null;
  onCancelProfileReply?: () => void;
  whisperingTo?: { id: string; username: string } | null;
  onCancelWhisper?: () => void;
  onTriggerWhisper?: (userId: string, username: string) => void;
  onTriggerReplyUser?: (userId: string, username: string) => void;
  onTriggerReplyProfile?: (userId: string, username: string, photoURL: string) => void;
  serverId?: string | null;
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
  { id: "animals", icon: <Ghost className="h-4 w-4" />, label: "Animals", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🕸", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🐐", "🦌", "🐕", "🐩", "🦮", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"] }
];

const CHEAT_CODES = [
  { icon: <Eraser className="h-4 w-4 text-orange-500" />, label: "clr", description: "Clear current chat history locally", usage: "@clr" },
  { icon: <Trash2 className="h-4 w-4 text-red-500" />, label: "del", description: "Delete last X messages from you", usage: "@del 5" },
  { icon: <Ghost className="h-4 w-4 text-indigo-500" />, label: "whisper", description: "Private message someone", usage: "@whisper @user text" }
];

export function MessageInput({ 
  onSendMessage, 
  onExecuteCommand, 
  inputRef: externalInputRef, 
  replyingTo, 
  onCancelReply, 
  profileReplyTarget,
  onCancelProfileReply,
  whisperingTo, 
  onCancelWhisper, 
  onTriggerWhisper, 
  onTriggerReplyUser,
  onTriggerReplyProfile,
  serverId 
}: MessageInputProps) {
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  
  const [commandSearch, setCommandSearch] = useState("");
  const [whisperSearch, setWhisperSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showWhisperSuggestions, setShowWhisperSuggestions] = useState(false);

  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const replyUserRef = useMemoFirebase(() => (replyingTo ? doc(db, "users", replyingTo.senderId) : null), [db, replyingTo?.senderId]);
  const { data: replyUser } = useDoc(replyUserRef);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId]);
  const { data: communityMembers } = useCollection(membersQuery);

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

  useEffect(() => {
    if (text.startsWith("@") && !text.includes(" ")) {
      setShowSuggestions(true);
      setShowWhisperSuggestions(false);
      setCommandSearch(text.slice(1).toLowerCase());
    } 
    else if (text.match(/^@whisper\s+@?([a-zA-Z0-9._-]*)$/i)) {
      const match = text.match(/^@whisper\s+@?([a-zA-Z0-9._-]*)$/i);
      setShowWhisperSuggestions(true);
      setShowSuggestions(false);
      setWhisperSearch(match?.[1]?.toLowerCase() || "");
    }
    else {
      setShowSuggestions(false);
      setShowWhisperSuggestions(false);
    }
  }, [text]);

  const applyFormatting = (prefix: string, suffix: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart || 0;
    const end = inputRef.current.selectionEnd || 0;
    const selectedText = text.substring(start, end);
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    const newText = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    setText(newText);
    
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = start + prefix.length + selectedText.length + suffix.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleApplyCommand = (usage: string) => {
    setText(usage);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleApplyWhisperTarget = (username: string) => {
    setText(`@whisper @${username} `);
    setShowWhisperSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    if (text.trim() === "@clr") {
      await onExecuteCommand?.("clr", []);
      setText("");
      return;
    }
    if (text.startsWith("@del ")) {
      const parts = text.split(" ");
      await onExecuteCommand?.("del", [parts[1]]);
      setText("");
      return;
    }

    let finalContent = text;
    let finalWhisperTo = whisperingTo;

    const whisperRegex = /^@whisper\s+@?([a-zA-Z0-9._-]+)\s+(.+)$/i;
    const match = text.match(whisperRegex);
    
    if (match) {
      const targetUsername = match[1].toLowerCase();
      const messageContent = match[2];
      setIsProcessing(true);
      
      try {
        const q = query(collection(db, "users"), where("username", "==", targetUsername), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const targetData = snap.docs[0].data();
          finalWhisperTo = { 
            id: snap.docs[0].id, 
            username: targetData.username || targetUsername 
          };
          finalContent = messageContent;
        } else {
          toast({ variant: "destructive", title: "Whisper Error", description: `User @${targetUsername} not found.` });
          setIsProcessing(false);
          return;
        }
      } catch (e) {
        console.error("Whisper resolution failed", e);
      } finally {
        setIsProcessing(false);
      }
    }

    const duration = disappearDuration === -1 ? (parseInt(customSeconds) || 10) * 1000 : disappearDuration;
    
    // Normalizing identity to fix "js js"
    const finalTargetName = profileReplyTarget?.username || replyUser?.username || replyingTo?.senderName || "User";
    const finalTargetPhoto = profileReplyTarget?.photoURL || replyUser?.photoURL || replyingTo?.senderPhotoURL || "";

    onSendMessage(
      finalContent, 
      undefined, 
      undefined, 
      finalTargetName, 
      { enabled: disappearingEnabled, duration: duration }, 
      imagePreview || undefined, 
      filePreview || undefined, 
      finalWhisperTo,
      finalTargetPhoto,
      !!profileReplyTarget,
      profileReplyTarget ? {
        totalCommunities: profileReplyTarget.totalCommunities,
        commonCommunities: profileReplyTarget.commonCommunities,
        bio: profileReplyTarget.bio
      } : undefined
    );
    
    setText("");
    setImagePreview(null);
    setFilePreview(null);
    setShowFormatting(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) {
      toast({ variant: "destructive", title: "Image too large", description: "Limit: 800KB" });
      return;
    }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10485760) {
      toast({ variant: "destructive", title: "File too large", description: "Limit: 10MB" });
      return;
    }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({
        url: reader.result as string,
        name: file.name,
        type: file.type
      });
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
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
          const finalTargetName = profileReplyTarget?.username || replyUser?.username || replyingTo?.senderName || "User";
          const finalTargetPhoto = profileReplyTarget?.photoURL || replyUser?.photoURL || replyingTo?.senderPhotoURL || "";
          onSendMessage("", reader.result as string, undefined, finalTargetName, { enabled: disappearingEnabled, duration: duration }, undefined, undefined, whisperingTo, finalTargetPhoto, !!profileReplyTarget);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Error", description: "Access denied." });
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
          const finalTargetName = profileReplyTarget?.username || replyUser?.username || replyingTo?.senderName || "User";
          const finalTargetPhoto = profileReplyTarget?.photoURL || replyUser?.photoURL || replyingTo?.senderPhotoURL || "";
          onSendMessage("", undefined, reader.result as string, finalTargetName, { enabled: disappearingEnabled, duration: duration }, undefined, undefined, whisperingTo, finalTargetPhoto, !!profileReplyTarget);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecordingVideo(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Access denied." });
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

  const filteredCommands = CHEAT_CODES.filter(c => c.label.includes(commandSearch));
  const filteredMembers = communityMembers?.filter(m => m.username?.toLowerCase().includes(whisperSearch)) || [];

  return (
    <div className="bg-background shrink-0 w-full flex flex-col font-body relative">
      <AnimatePresence>
        {showSuggestions && filteredCommands.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-4 mb-2 z-50 w-72"
          >
            <Card className="rounded-[1.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-popover/95 backdrop-blur-xl overflow-hidden p-1">
              <div className="p-3 bg-primary/5 border-b flex items-center gap-2 mb-1">
                <Command className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Verse Commands</span>
              </div>
              <div className="space-y-0.5">
                {filteredCommands.map((c) => (
                  <button 
                    key={c.label} 
                    type="button"
                    onClick={() => handleApplyCommand(c.usage)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all text-left group"
                  >
                    <div className="p-2 bg-background rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      {c.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black uppercase tracking-tight text-foreground">@{c.label}</span>
                      <span className="text-[10px] text-muted-foreground truncate font-medium italic">{c.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {showWhisperSuggestions && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-4 mb-2 z-50 w-72"
          >
            <Card className="rounded-[1.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-popover/95 backdrop-blur-xl overflow-hidden p-1">
              <div className="p-3 bg-indigo-500/10 border-b flex items-center gap-2 mb-1">
                <Ghost className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Whisper Target</span>
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-0.5">
                  {filteredMembers.length === 0 ? (
                    <div className="p-8 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">No Members Found</div>
                  ) : (
                    filteredMembers.map((m) => (
                      <button 
                        key={m.id} 
                        type="button"
                        onClick={() => handleApplyWhisperTarget(m.username)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all text-left group"
                      >
                        <Avatar className="h-8 w-8 border border-border shadow-sm">
                          <AvatarImage src={m.photoURL} />
                          <AvatarFallback className="bg-primary text-white font-black text-[10px]">{m.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black uppercase tracking-tight text-foreground">@{m.username}</span>
                          <span className="text-[9px] text-muted-foreground truncate font-medium italic">{m.bio || "Member of the Verse"}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {(replyingTo || profileReplyTarget) && (
        <div className="px-4 py-2 bg-muted/30 border-t flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
                <AvatarImage src={profileReplyTarget?.photoURL || replyUser?.photoURL || replyingTo?.senderPhotoURL} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-xs font-black">
                  {String(profileReplyTarget?.username || replyUser?.username || replyingTo?.senderName || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full shadow-lg border-2 border-background">
                {profileReplyTarget ? <Camera className="h-3 w-3 text-white" /> : <Reply className="h-3 w-3 text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                  {profileReplyTarget ? `Commenting on @${profileReplyTarget.username}'s identity` : `Replying to @${replyUser?.username || replyingTo?.senderName || "User"}`}
                </span>
                {profileReplyTarget && <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />}
              </div>
              <p className="text-xs text-muted-foreground truncate italic font-medium">
                {profileReplyTarget ? (profileReplyTarget.bio || "Sharing thoughts on this identity picture.") : (replyingTo.content || replyingTo.text || "Media message")}
              </p>
              
              {profileReplyTarget && (
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-primary/60" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Connected: {profileReplyTarget.totalCommunities} Communities</span>
                  </div>
                  <div className="w-[1px] h-3 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-primary/60" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">Mutual Verse: {profileReplyTarget.commonCommunities} Shared</span>
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={profileReplyTarget ? onCancelProfileReply : onCancelReply} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors shadow-sm bg-background/50">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {whisperingTo && (
        <div className="px-4 py-2 bg-indigo-500/10 border-t flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-150">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg shrink-0">
            <Ghost className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Whispering to @{whisperingTo.username}</span>
            <p className="text-xs text-muted-foreground truncate italic font-medium">This message is invisible to others.</p>
          </div>
          <button type="button" onClick={onCancelWhisper} className="h-6 w-6 rounded-full hover:bg-indigo-500/10 flex items-center justify-center transition-colors">
            <X className="h-3 w-3 text-indigo-500" />
          </button>
        </div>
      )}

      {imagePreview && (
        <div className="px-4 py-3 bg-muted/20 border-t flex flex-col gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Image Preview</span>
            <button type="button" onClick={() => setImagePreview(null)} className="h-6 w-6 rounded-full bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
            <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
          </div>
        </div>
      )}

      {filePreview && (
        <div className="px-4 py-3 bg-muted/20 border-t flex flex-col gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Document Selected</span>
            <button type="button" onClick={() => setFilePreview(null)} className="h-6 w-6 rounded-full bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-background rounded-xl border-2 border-primary/20 shadow-lg w-fit max-w-full">
            <div className="p-2 bg-primary/10 rounded-lg">
              {filePreview.type.includes('pdf') ? <FileText className="h-5 w-5 text-primary" /> : <Paperclip className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold truncate max-w-[200px]">{filePreview.name}</span>
              <span className="text-[9px] font-black text-muted-foreground uppercase">{filePreview.type.split('/')[1] || 'FILE'}</span>
            </div>
          </div>
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
              <button type="button" onClick={cancelRecording} className="h-11 w-11 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"><Trash2 className="h-5 w-5" /></button>
              <Button type="button" size="icon" className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/30 text-white transition-transform active:scale-90" onClick={stopRecording}>
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
                <button type="button" onClick={() => setDisappearingEnabled(false)} className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"><X className="h-3 w-3" /></button>
              </div>
            )}

            <div className="flex flex-col gap-2 bg-muted/20 rounded-2xl p-1.5 border border-border/50">
              <AnimatePresence>
                {showFormatting && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="flex items-center gap-1 px-2 py-1 border-b border-border/50 overflow-hidden"
                  >
                    <button type="button" onClick={() => applyFormatting("**", "**")} className="h-8 w-8 rounded-lg hover:bg-background flex items-center justify-center text-foreground/70 hover:text-primary transition-all"><Bold className="h-4 w-4" /></button>
                    <button type="button" onClick={() => applyFormatting("__", "__")} className="h-8 w-8 rounded-lg hover:bg-background flex items-center justify-center text-foreground/70 hover:text-primary transition-all"><Italic className="h-4 w-4" /></button>
                    <div className="w-[1px] h-4 bg-border/50 mx-1" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-background text-[10px] font-black uppercase tracking-widest text-foreground/70 hover:text-primary transition-all">
                          <Type className="h-3.5 w-3.5" /> Font
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40 font-black uppercase text-[10px] tracking-widest p-1 border-none shadow-2xl bg-popover/95 backdrop-blur-md">
                        <DropdownMenuItem onClick={() => applyFormatting("", "")} className="rounded-lg p-2">Default Sans</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyFormatting("[[serif]]", "[[/serif]]")} className="rounded-lg p-2 font-['Playfair_Display'] capitalize italic">Playfair Serif</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyFormatting("[[mono]]", "[[/mono]]")} className="rounded-lg p-2 font-mono">Monospace</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className={cn("h-9 w-9 flex items-center justify-center transition-colors rounded-xl", disappearingEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                        <Clock className="h-5 w-5" />
                      </button>
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
                  
                  <button 
                    type="button" 
                    onClick={() => setShowFormatting(!showFormatting)} 
                    className={cn("h-9 w-9 flex items-center justify-center transition-colors rounded-xl", showFormatting ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}
                  >
                    <TypeOutline className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 relative">
                  <input 
                    ref={inputRef}
                    placeholder={profileReplyTarget ? `Commenting on @${profileReplyTarget.username}'s profile...` : (replyingTo ? `Replying...` : (whisperingTo ? `Whisper to @${whisperingTo.username}...` : "Karo Chutiyapaa..."))}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-transparent border-none rounded-xl px-2 py-2.5 text-sm font-body font-medium focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/70 tracking-tight"
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

                <div className="flex items-center gap-1 pr-1.5">
                  {(text.trim() || imagePreview || filePreview) ? (
                    <Button type="submit" size="icon" disabled={isProcessing} className={cn("rounded-xl h-10 w-10 shrink-0 shadow-lg transition-transform active:scale-90", whisperingTo ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <>
                      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={startVideoRecording} className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"><Video className="h-5 w-5" /></button>
                      <button type="button" onClick={startRecording} className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95"><Mic className="h-5 w-5" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
