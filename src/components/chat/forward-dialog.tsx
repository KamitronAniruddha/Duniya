
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, setDoc, orderBy } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Search, Forward, Loader2, CheckCircle2, X, Info, Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { type ForwardHop } from "./message-bubble";

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messagesToForward: any[];
  currentCommunityName?: string;
  currentChannelName?: string;
}

interface SelectedTarget {
  type: "channel";
  communityId: string;
  communityName: string;
  channelId: string;
  channelName: string;
}

export function ForwardDialog({ open, onOpenChange, messagesToForward, currentCommunityName, currentChannelName }: ForwardDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<SelectedTarget[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const [includeRoot, setIncludeRoot] = useState(true);

  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "communities"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);
  const { data: communities } = useCollection(communitiesQuery);

  const toggleTargetSelection = (target: SelectedTarget) => {
    setSelectedTargets(prev => {
      const isAlreadySelected = prev.find(t => t.channelId === target.channelId);
      if (isAlreadySelected) {
        return prev.filter(t => t.channelId !== target.channelId);
      } else {
        return [...prev, target];
      }
    });
  };

  const handleForward = async () => {
    if (selectedTargets.length === 0 || !user || !db || messagesToForward.length === 0) return;
    setIsForwarding(true);

    try {
      for (const target of selectedTargets) {
        const basePath = `communities/${target.communityId}/channels/${target.channelId}`;

        for (const msg of messagesToForward) {
          const newMsgRef = doc(collection(db, basePath, "messages"));
          const currentSenderName = user.displayName || "User";
          const existingChain: ForwardHop[] = msg.forwardingChain || [];
          const newChain: ForwardHop[] = [...existingChain];

          if (includeRoot) {
             if (newChain.length === 0) {
               newChain.push({
                 communityName: currentCommunityName || "Duniya Verse",
                 channelName: currentChannelName || "General",
                 senderName: msg.senderName || "Original Sender",
                 timestamp: msg.sentAt || new Date().toISOString(),
                 isInitial: true
               });
             }
             newChain.push({
               communityName: target.communityName,
               channelName: target.channelName,
               viaCommunity: currentCommunityName,
               viaChannel: currentChannelName,
               senderName: currentSenderName,
               timestamp: new Date().toISOString()
             });
          }

          const data = {
            id: newMsgRef.id,
            channelId: target.channelId,
            senderId: user.uid,
            senderName: currentSenderName,
            content: msg.content || "",
            type: msg.type || "text",
            sentAt: new Date().toISOString(),
            isForwarded: true,
            audioUrl: msg.audioUrl || null,
            videoUrl: msg.videoUrl || null,
            imageUrl: msg.imageUrl || null,
            fileUrl: msg.fileUrl || null,
            fileName: msg.fileName || null,
            fileType: msg.fileType || null,
            seenBy: [],
            deletedFor: [],
            viewerExpireAt: {},
            fullyDeleted: false,
            ...(includeRoot && { forwardingChain: newChain })
          };
          await setDoc(newMsgRef, data);
        }
      }

      toast({ title: "Messages Forwarded" });
      onOpenChange(false);
      setSelectedTargets([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Forward Failed", description: e.message });
    } finally {
      setIsForwarding(false);
    }
  };

  const filteredCommunities = communities?.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw] h-[90vh] max-h-[90vh] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
        <DialogHeader className="p-6 pb-2 shrink-0 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Forward className="h-6 w-6 text-primary" />
            Forward Message
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground">
            Broadcast to community channels in the Verse.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4 shrink-0 mb-2">
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-3">
              <Info className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <Label className="text-xs font-bold">Trace Genealogy</Label>
                <p className="text-[10px] text-muted-foreground">Include message history.</p>
              </div>
            </div>
            <Switch checked={includeRoot} onCheckedChange={setIncludeRoot} />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Communities..." 
              className="pl-9 bg-muted/50 border-none rounded-xl text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedTargets.length > 0 && (
            <ScrollArea className="max-h-16 w-full">
              <div className="flex flex-wrap gap-1.5 p-1">
                {selectedTargets.map(t => (
                  <Badge key={t.channelId} variant="secondary" className="flex items-center gap-1 py-1 px-2 rounded-lg bg-primary/10 text-primary border-primary/20">
                    <Hash className="h-3 w-3" />
                    <span className="text-[10px] font-bold">{t.channelName}</span>
                    <button onClick={() => toggleTargetSelection(t)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-6">
          <ScrollArea className="h-full w-full">
            <div className="space-y-4 pb-6">
              {filteredCommunities?.map((community) => (
                <CommunitySection 
                  key={community.id} 
                  community={community} 
                  onSelect={toggleTargetSelection}
                  selectedIds={selectedTargets.map(c => c.channelId)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {selectedTargets.length} Destinations selected
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" className="flex-1 sm:flex-none rounded-xl font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              className="flex-1 sm:flex-none rounded-xl font-black px-6 shadow-lg shadow-primary/20" 
              disabled={selectedTargets.length === 0 || isForwarding}
              onClick={handleForward}
            >
              {isForwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Forward"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommunitySection({ community, onSelect, selectedIds }: { community: any, onSelect: (target: SelectedTarget) => void, selectedIds: string[] }) {
  const db = useFirestore();
  const channelsQuery = useMemoFirebase(() => query(collection(db, "communities", community.id, "channels")), [db, community.id]);
  const { data: channels } = useCollection(channelsQuery);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Avatar className="h-5 w-5 rounded-md border shadow-sm">
          <AvatarImage src={community.icon} />
          <AvatarFallback className="text-[8px] bg-primary text-white font-black">{community.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{community.name}</span>
      </div>
      <div className="space-y-1">
        {channels?.map(chan => {
          const isSelected = selectedIds.includes(chan.id);
          return (
            <button
              key={chan.id}
              onClick={() => onSelect({ 
                type: "channel", 
                communityId: community.id, 
                communityName: community.name, 
                channelId: chan.id, 
                channelName: chan.name 
              })}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl transition-all border text-left",
                isSelected ? "bg-primary/10 border-primary shadow-sm" : "bg-background border-transparent hover:border-muted hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Hash className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>{chan.name}</span>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
