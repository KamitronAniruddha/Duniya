
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Smile, History, Ghost, X, Mic, Square, Trash2, Video, Timer, Clock, Image as ImageIcon, Loader2, Paperclip, FileText, Type, TypeOutline, Eraser, Command, User as UserIcon, Palette, Link, Compass, Check, BellOff, Bell, LogOut, Info, Sparkles, EyeOff, Lock, Shield, ShieldAlert, Activity, Zap, Heart, Camera, Reply, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from "@/firebase";
import { doc, collection, query, where, getDocs, limit, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { XP_REWARDS, awardXP } from "@/lib/xp-system";

interface ProfileReplyTarget {
  id: string;
  username: string;
  photoURL: string;
  bio?: string;
  totalCommunities: number;
  commonCommunities: number;
  joinedAt?: string;
}

interface MessageInputProps {
  onSendMessage: (
    content: string, 
    audioUrl?: string, 
    videoUrl?: string, 
    replySenderName?: string, 
    disappearing?: { enabled: boolean; duration: number }, 
    imageUrl?: string,
    file?: { url: string; name: string; type: string },
    whisperTarget?: { id: string; username: string } | null,
    replySenderPhotoURL?: string,
    isProfileReply?: boolean,
    profileContext?: any,
    isSensitive?: boolean,
    customType?: string
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

const CHEAT_CODES = [
  { icon: <Eraser className="h-4 w-4 text-orange-500" />, label: "clr", description: "Clear current chat history", usage: "@clr" },
  { icon: <Trash2 className="h-4 w-4 text-red-500" />, label: "del", description: "Delete last X messages", usage: "@del 5" },
  { icon: <Lock className="h-4 w-4 text-indigo-500" />, label: "whisper", description: "Toggle private whisper mode", usage: "@whisper @username" },
  { icon: <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />, label: "vibe", description: "Send an intimate digital pulse", usage: "@vibe @username I adore you" },
  { icon: <Target className="h-4 w-4 text-primary" />, label: "guess", description: "Verse Guess Master Game", usage: "@guess start [1-3]" },
  { icon: <Activity className="h-4 w-4 text-emerald-500" />, label: "ping", description: "Verse sync latency", usage: "@ping" },
  { icon: <Palette className="h-4 w-4 text-pink-500" />, label: "theme", description: "Cycle visual vibes", usage: "@theme" },
  { icon: <UserIcon className="h-4 w-4 text-blue-500" />, label: "profile", description: "Modify identity signature", usage: "@profile" },
  { icon: <Compass className="h-4 w-4 text-indigo-600" />, label: "explore", description: "Duniya discovery hub", usage: "@explore" },
  { icon: <Info className="h-4 w-4 text-cyan-500" />, label: "help", description: "Reveal command library", usage: "@help" }
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
  
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearDuration, setDisappearDuration] = useState(10000);
  const [isSensitive, setIsSensitive] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  
  const [commandSearch, setCommandSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingBroadcastingRef = useRef(false);
  const lastTypingWriteRef = useRef<number>(0);

  const userDocRef = useMemoFirebase(() => (user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const replyTargetId = profileReplyTarget?.id || replyingTo?.senderId;
  const targetRef = useMemoFirebase(() => (replyTargetId ? doc(db, "users", replyTargetId) : null), [db, replyTargetId]);
  const { data: targetPrivacyData } = useDoc(targetRef);

  const isTargetHidden = !!targetPrivacyData?.isProfileHidden && targetPrivacyData?.id !== user?.uid;
  const isTargetBlurred = !!targetPrivacyData?.isProfileBlurred && 
                          targetPrivacyData?.id !== user?.uid && 
                          !targetPrivacyData?.authorizedViewers?.some((v: any) => v.uid === user?.uid && new Date(v.expiresAt) > new Date());

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

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping();
    };
  }, [text, db, user, serverId, channelId, userData]);

  useEffect(() => {
    if (text.startsWith("@") && !text.includes(" ")) {
      setShowSuggestions(true);
      setCommandSearch(text.slice(1).toLowerCase());
    } else {
      setShowSuggestions(false);
    }
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    const cmdMatch = text.trim().match(/^@(\w+)(?:\s+(.*))?$/);
    if (cmdMatch) {
      const cmd = cmdMatch[1].toLowerCase();
      const rawArgs = cmdMatch[2] || "";
      // Robust splitting to ignore extra whitespace
      const args = rawArgs ? rawArgs.trim().split(/\s+/) : [];
      const handled = await onExecuteCommand?.(cmd, args);
      if (handled) {
        setText("");
        return;
      }
    }

    const profileContext = profileReplyTarget ? {
      targetUserId: profileReplyTarget.id,
      totalCommunities: profileReplyTarget.totalCommunities,
      commonCommunities: profileReplyTarget.commonCommunities,
      bio: profileReplyTarget.bio,
      joinedAt: profileReplyTarget.joinedAt || new Date().toISOString()
    } : undefined;

    const xpReward = Math.floor(XP_REWARDS.MESSAGE_BASE + (text.length * XP_REWARDS.MESSAGE_PER_CHAR));
    awardXP(db, user!.uid, xpReward, 'chatting', `Creative Dispatch: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`);

    onSendMessage(
      text, 
      undefined, 
      undefined, 
      profileReplyTarget?.username || replyingTo?.senderName || "User", 
      { enabled: disappearingEnabled, duration: disappearDuration }, 
      imagePreview || undefined, 
      filePreview || undefined, 
      whisperingTo,
      profileReplyTarget?.photoURL || replyingTo?.senderPhotoURL || "",
      !!profileReplyTarget,
      profileContext,
      isSensitive
    );
    
    setText("");
    setImagePreview(null);
    setFilePreview(null);
    setIsSensitive(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) { toast({ variant: "destructive", title: "Limit: 800KB" }); return; }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => { setImagePreview(reader.result as string); setIsProcessing(false); };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10485760) { toast({ variant: "destructive", title: "Limit: 10MB" }); return; }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => { setFilePreview({ url: reader.result as string, name: file.name, type: file.type }); setIsProcessing(false); };
    reader.readAsDataURL(file);
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
        reader.onloadend = () => onSendMessage("", reader.result as string, undefined, profileReplyTarget?.username || replyingTo?.senderName, { enabled: disappearingEnabled, duration: disappearDuration }, undefined, undefined, whisperingTo, undefined, !!profileReplyTarget, undefined, isSensitive);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) { toast({ variant: "destructive", title: "Microphone denied" }); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) mediaRecorderRef.current.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); };

  const filteredCommands = CHEAT_CODES.filter(c => c.label.includes(commandSearch));

  return (
    <div className="bg-background shrink-0 w-full flex flex-col font-body relative">
      <AnimatePresence>
        {showSuggestions && filteredCommands.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-4 mb-2 z-50 w-72">
            <Card className="rounded-[2rem] border-none shadow-2xl bg-popover/95 backdrop-blur-xl p-1 overflow-hidden">
              <ScrollArea className="h-64">
                {filteredCommands.map(c => (
                  <button key={c.label} type="button" onClick={() => { setText(c.usage); setShowSuggestions(false); inputRef.current?.focus(); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted text-left group">
                    <div className="p-2 bg-background rounded-lg shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                    <div className="flex flex-col min-w-0"><span className="text-xs font-black uppercase tracking-tight text-foreground">@{c.label}</span><span className="text-[10px] text-muted-foreground truncate font-medium italic">{c.description}</span></div>
                  </button>
                ))}
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {whisperingTo && (
        <div className="px-4 py-2 bg-indigo-500/10 border-t flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 rounded-lg shadow-lg">
              <Lock className="h-3 w-3 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Whisper Node Active</span>
              <p className="text-xs text-indigo-600/70 font-bold">Only @{whisperingTo.username} can decrypt this message.</p>
            </div>
          </div>
          <button type="button" onClick={onCancelWhisper} className="h-8 w-8 rounded-full hover:bg-indigo-500/10 flex items-center justify-center transition-colors"><X className="h-4 w-4 text-indigo-600" /></button>
        </div>
      )}

      {(replyingTo || profileReplyTarget) && (
        <div className="px-4 py-2 bg-muted/30 border-t flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className={cn("h-12 w-12 border-2 border-primary/20 shadow-md", isTargetBlurred && "blur-sm", isTargetHidden && "blur-xl")}>
                {isTargetHidden ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground"><Ghost className="h-5 w-5" /></div>
                ) : (
                  <>
                    <AvatarImage src={isTargetBlurred ? undefined : (profileReplyTarget?.photoURL || replyingTo?.senderPhotoURL || undefined)} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-xs font-black">
                      {String(profileReplyTarget?.username || replyingTo?.senderName || "?")[0].toUpperCase()}
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
                  {profileReplyTarget ? `Commenting on @${profileReplyTarget.username}` : `Replying to @${targetPrivacyData?.username || (replyingTo?.senderName ? replyingTo.senderName.replace(/^@/, '') : "User")}`}
                </span>
                {isTargetHidden && <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full">Encrypted</span>}
              </div>
              <p className={cn("text-xs text-muted-foreground truncate font-medium", !isTargetHidden && "italic")}>
                {isTargetHidden ? "Identity context restricted." : (profileReplyTarget ? (profileReplyTarget.bio || "Sharing thoughts on this identity picture.") : (replyingTo.content || replyingTo.text || "Media message"))}
              </p>
            </div>
            <button type="button" onClick={profileReplyTarget ? onCancelProfileReply : onCancelReply} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors shadow-sm bg-background/50"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div className="p-4 bg-background border-t relative">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-5xl mx-auto">
          <div className="flex flex-col gap-2 bg-muted/20 rounded-2xl p-1.5 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button type="button" onClick={() => setDisappearingEnabled(!disappearingEnabled)} className={cn("h-9 w-9 flex items-center justify-center transition-colors rounded-xl", disappearingEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}><Clock className="h-5 w-5" /></button>
                <button type="button" onClick={() => setShowFormatting(!showFormatting)} className={cn("h-9 w-9 flex items-center justify-center transition-colors rounded-xl", showFormatting ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}><TypeOutline className="h-5 w-5" /></button>
              </div>
              <input ref={inputRef} placeholder="Karo Chutiyapaa..." value={text} onChange={(e) => setText(e.target.value)} disabled={isProcessing} className="w-full bg-transparent border-none px-2 py-2.5 text-sm font-medium focus:outline-none text-foreground placeholder:text-muted-foreground/70" />
              <div className="flex items-center gap-1 pr-1.5">
                {(text.trim() || imagePreview || filePreview) ? <Button type="submit" size="icon" disabled={isProcessing} className="rounded-xl h-10 w-10 shadow-lg"><SendHorizontal className="h-4 w-4" /></Button> : <><input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} /><input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} /><button type="button" onClick={() => imageInputRef.current?.click()} className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-primary"><ImageIcon className="h-5 w-5" /></button><button type="button" onClick={startRecording} className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-primary hover:text-white"><Mic className="h-5 w-5" /></button></>}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
