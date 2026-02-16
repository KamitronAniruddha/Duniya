
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Smile, History, Ghost, X, Mic, Square, Trash2, Video, Timer, Clock, Image as ImageIcon, Loader2, Paperclip, FileText, Type, TypeOutline, Eraser, Command, User as UserIcon, Palette, Link, Compass, Check, BellOff, Bell, LogOut, Info, Sparkles, EyeOff, Lock, Shield, ShieldAlert, Activity, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from "@/firebase";
import { doc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
    profileContext?: any,
    isSensitive?: boolean
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
  channelId?: string | null;
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
  { icon: <Ghost className="h-4 w-4 text-indigo-500" />, label: "whisper", description: "Private message someone", usage: "@whisper @user text" },
  { icon: <Activity className="h-4 w-4 text-emerald-500" />, label: "ping", description: "Sync check with the Verse node", usage: "@ping" },
  { icon: <Zap className="h-4 w-4 text-amber-500" />, label: "stats", description: "View your network intelligence data", usage: "@stats" },
  { icon: <Ghost className="h-4 w-4 text-indigo-400" />, label: "ghost", description: "Toggle ephemeral ghost mode", usage: "@ghost" },
  { icon: <EyeOff className="h-4 w-4 text-rose-500" />, label: "phide", description: "Toggle profile visibility protocol", usage: "@phide" },
  { icon: <Lock className="h-4 w-4 text-amber-600" />, label: "porn", description: "Toggle blur-to-permission protocol", usage: "@porn" },
  { icon: <Palette className="h-4 w-4 text-pink-500" />, label: "theme", description: "Cycle through Verse visual vibes", usage: "@theme" },
  { icon: <UserIcon className="h-4 w-4 text-blue-500" />, label: "profile", description: "Modify your identity signature", usage: "@profile" },
  { icon: <Link className="h-4 w-4 text-sky-500" />, label: "invite", description: "Generate a portal for new members", usage: "@invite" },
  { icon: <Compass className="h-4 w-4 text-indigo-600" />, label: "explore", description: "Enter the Duniya Discovery Hub", usage: "@explore" },
  { icon: <Clock className="h-4 w-4 text-orange-400" />, label: "away", description: "Transition status to idle", usage: "@away" },
  { icon: <Check className="h-4 w-4 text-green-500" />, label: "online", description: "Broadcast active presence", usage: "@online" },
  { icon: <BellOff className="h-4 w-4 text-slate-400" />, label: "mute", description: "Silence Verse notifications", usage: "@mute" },
  { icon: <Bell className="h-4 w-4 text-yellow-500" />, label: "unmute", description: "Restore audio alerts", usage: "@unmute" },
  { icon: <History className="h-4 w-4 text-primary" />, label: "trace", description: "Genealogy tracing guide", usage: "@trace" },
  { icon: <Type className="h-4 w-4 text-violet-500" />, label: "font", description: "Toggle formatting bar", usage: "@font" },
  { icon: <Smile className="h-4 w-4 text-yellow-400" />, label: "shrug", description: "¯\\_(ツ)_/¯", usage: "@shrug" },
  { icon: <Trash2 className="h-4 w-4 text-red-400" />, label: "tableflip", description: "(╯°□°）╯︵ ┻━┻", usage: "@tableflip" },
  { icon: <Smile className="h-4 w-4 text-indigo-300" />, label: "lenny", description: "( ͡° ͜ʖ ͡°)", usage: "@lenny" },
  { icon: <Sparkles className="h-4 w-4 text-primary" />, label: "sparkle", description: "Add Verse energy to message", usage: "@sparkle text" },
  { icon: <LogOut className="h-4 w-4 text-destructive" />, label: "logout", description: "Safely disconnect from Verse", usage: "@logout" },
  { icon: <Info className="h-4 w-4 text-cyan-500" />, label: "help", description: "Reveal all Verse commands", usage: "@help" },
  { icon: <Heart className="h-4 w-4 text-red-500" />, label: "about", description: "Duniya Protocol Details", usage: "@about" }
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
  serverId,
  channelId
}: MessageInputProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearDuration, setDisappearDuration] = useState(10000);
  const [isSensitive, setIsSensitive] = useState(false);
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
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingBroadcastingRef = useRef(false);
  const lastTypingWriteRef = useRef<number>(0);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  // REAL-TIME PRIVACY SYNC FOR REPLY PREVIEW
  const replyTargetId = profileReplyTarget?.id || replyingTo?.senderId;
  const targetRef = useMemoFirebase(() => (replyTargetId ? doc(db, "users", replyTargetId) : null), [db, replyTargetId]);
  const { data: activeTargetData } = useDoc(targetRef);

  const isTargetHidden = !!activeTargetData?.isProfileHidden && activeTargetData?.id !== user?.uid;
  const isTargetBlurred = !!activeTargetData?.isProfileBlurred && 
                          activeTargetData?.id !== user?.uid && 
                          !activeTargetData?.authorizedViewers?.includes(user?.uid || "");

  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId]);
  const { data: communityMembers } = useCollection(membersQuery);

  // ACCURATE REAL-TIME TYPING ENGINE
  useEffect(() => {
    if (!db || !user || !serverId || !channelId) return;

    const stopTyping = () => {
      if (isTypingBroadcastingRef.current) {
        isTypingBroadcastingRef.current = false;
        deleteDocumentNonBlocking(doc(db, "communities", serverId, "channels", channelId, "typing", user.uid));
      }
    };

    const broadcastTyping = () => {
      setDocumentNonBlocking(doc(db, "communities", serverId, "channels", channelId, "typing", user.uid), {
        id: user.uid,
        username: userData?.username || user.displayName || "User",
        photoURL: userData?.photoURL || user.photoURL || "",
        lastTypedAt: new Date().toISOString()
      }, { merge: true });
      isTypingBroadcastingRef.current = true;
      lastTypingWriteRef.current = Date.now();
    };

    if (text.trim().length > 0) {
      const now = Date.now();
      if (!isTypingBroadcastingRef.current || (now - lastTypingWriteRef.current > 2500)) {
        broadcastTyping();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(stopTyping, 4000);
    } else {
      stopTyping();
    }

    const handleUnload = () => stopTyping();
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stopTyping(); });

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping();
    };
  }, [text, db, user, serverId, channelId, userData]);

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

    const cmdMatch = text.trim().match(/^@(\w+)(?:\s+(.*))?$/);
    if (cmdMatch) {
      const cmd = cmdMatch[1].toLowerCase();
      const rawArgs = cmdMatch[2] || "";
      const args = rawArgs ? rawArgs.split(" ") : [];

      if (cmd === "shrug") { onSendMessage("¯\\_(ツ)_/¯" + (rawArgs ? " " + rawArgs : "")); setText(""); return; }
      if (cmd === "tableflip") { onSendMessage("(╯°□°）╯︵ ┻━┻" + (rawArgs ? " " + rawArgs : "")); setText(""); return; }
      if (cmd === "lenny") { onSendMessage("( ͡° ͜ʖ ͡°)" + (rawArgs ? " " + rawArgs : "")); setText(""); return; }
      if (cmd === "sparkle") { onSendMessage("✨ " + (rawArgs || "Verse Energy") + " ✨"); setText(""); return; }
      if (cmd === "ghost") { setDisappearingEnabled(!disappearingEnabled); setText(""); return; }
      if (cmd === "font") { setShowFormatting(!showFormatting); setText(""); return; }

      const handled = await onExecuteCommand?.(cmd, args);
      if (handled) {
        setText("");
        return;
      }
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
    
    const finalTargetName = profileReplyTarget?.username || activeTargetData?.username || replyingTo?.senderName || "User";
    const finalTargetPhoto = profileReplyTarget?.photoURL || activeTargetData?.photoURL || replyingTo?.senderPhotoURL || "";

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
        targetUserId: profileReplyTarget.id,
        totalCommunities: profileReplyTarget.totalCommunities,
        commonCommunities: profileReplyTarget.commonCommunities,
        bio: profileReplyTarget.bio
      } : undefined,
      isSensitive
    );
    
    setText("");
    setImagePreview(null);
    setFilePreview(null);
    setIsSensitive(false);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const duration = disappearDuration === -1 ? (parseInt(customSeconds) || 10) * 1000 : disappearDuration;
          const finalTargetName = profileReplyTarget?.username || activeTargetData?.username || replyingTo?.senderName || "User";
          const finalTargetPhoto = profileReplyTarget?.photoURL || activeTargetData?.photoURL || replyingTo?.senderPhotoURL || "";
          onSendMessage("", reader.result as string, undefined, finalTargetName, { enabled: disappearingEnabled, duration: duration }, undefined, undefined, whisperingTo, finalTargetPhoto, !!profileReplyTarget, undefined, isSensitive);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Error", description: "Access denied." });
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
              <ScrollArea className="h-72">
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
              </ScrollArea>
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
              <ScrollArea className="h-72">
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
                          <AvatarImage src={m.photoURL || undefined} />
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
              <Avatar className={cn(
                "h-12 w-12 border-2 border-primary/20 shadow-md",
                isTargetBlurred && "blur-sm",
                isTargetHidden && "blur-xl"
              )}>
                {isTargetHidden ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Ghost className="h-5 w-5" />
                  </div>
                ) : (
                  <>
                    <AvatarImage src={isTargetBlurred ? undefined : (profileReplyTarget?.photoURL || activeTargetData?.photoURL || replyingTo?.senderPhotoURL || undefined)} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-xs font-black">
                      {String(profileReplyTarget?.username || activeTargetData?.username || replyingTo?.senderName || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full shadow-lg border-2 border-background">
                {profileReplyTarget ? <Camera className="h-3 w-3 text-white" /> : <Reply className="h-3 w-3 text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                  {profileReplyTarget ? `Commenting on @${profileReplyTarget.username}'s identity` : `Replying to @${activeTargetData?.username || replyingTo?.senderName || "User"}`}
                </span>
                {profileReplyTarget && !isTargetHidden && <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />}
                {isTargetHidden && <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full">Encrypted</span>}
              </div>
              <p className={cn(
                "text-xs text-muted-foreground truncate font-medium",
                !isTargetHidden && "italic"
              )}>
                {isTargetHidden ? "Captured identity context is no longer visible." : (profileReplyTarget ? (activeTargetData?.bio || profileReplyTarget.bio || "Sharing thoughts on this identity picture.") : (replyingTo.content || replyingTo.text || "Media message"))}
              </p>
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

      {(imagePreview || filePreview) && (
        <div className="px-4 py-3 bg-muted/20 border-t flex flex-col gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">{imagePreview ? 'Image Preview' : 'Document Selected'}</span>
              <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 cursor-pointer" onClick={() => setIsSensitive(!isSensitive)}>
                <ShieldAlert className={cn("h-3 w-3 transition-colors", isSensitive ? "text-amber-600 fill-amber-600" : "text-muted-foreground")} />
                <span className={cn("text-[8px] font-black uppercase", isSensitive ? "text-amber-600" : "text-muted-foreground")}>{isSensitive ? 'Marked Sensitive' : 'Mark as Sensitive'}</span>
              </div>
            </div>
            <button type="button" onClick={() => { setImagePreview(null); setFilePreview(null); setIsSensitive(false); }} className="h-6 w-6 rounded-full bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {imagePreview ? (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
              <img src={imagePreview} className={cn("w-full h-full object-cover transition-all", isSensitive && "blur-md")} alt="Preview" />
              {isSensitive && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Shield className="h-6 w-6 text-white" /></div>}
            </div>
          ) : filePreview && (
            <div className="flex items-center gap-3 p-3 bg-background rounded-xl border-2 border-primary/20 shadow-lg w-fit max-w-full">
              <div className="p-2 bg-primary/10 rounded-lg">
                {filePreview.type.includes('pdf') ? <FileText className="h-5 w-5 text-primary" /> : <Paperclip className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold truncate max-w-[200px]">{filePreview.name}</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase">{filePreview.type.split('/')[1] || 'FILE'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-background border-t relative">
        {(isRecording || isRecordingVideo) ? (
          <div className="flex items-center gap-4 max-w-5xl mx-auto bg-muted/20 p-3 rounded-2xl animate-in fade-in zoom-in-95 border border-primary/10 shadow-xl">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 text-red-500 rounded-full w-fit border border-red-500/20">
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-sm font-black font-mono">{formatTime(recordingTime)}</span>
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
            <div className="flex flex-col gap-2 bg-muted/20 rounded-2xl p-1.5 border border-border/50">
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
