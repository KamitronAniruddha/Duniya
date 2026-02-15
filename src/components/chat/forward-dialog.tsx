
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, setDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Search, Forward, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messagesToForward: any[];
}

export function ForwardDialog({ open, onOpenChange, messagesToForward }: ForwardDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<{ communityId: string, channelId: string, name: string } | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);

  // Get user's communities
  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "communities"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);
  const { data: communities } = useCollection(communitiesQuery);

  // We'll need to fetch channels for each community, but for the UI we'll flatten them or show them by community
  // For simplicity and speed in this UI, we show the first few channels of each community or a list
  
  const handleForward = async () => {
    if (!selectedChannel || !user || !db || messagesToForward.length === 0) return;
    setIsForwarding(true);

    try {
      for (const msg of messagesToForward) {
        const newMsgRef = doc(collection(db, "communities", selectedChannel.communityId, "channels", selectedChannel.channelId, "messages"));
        const data = {
          id: newMsgRef.id,
          channelId: selectedChannel.channelId,
          senderId: user.uid,
          content: msg.content || msg.text || "",
          type: msg.type || "text",
          sentAt: new Date().toISOString(),
          isForwarded: true,
          audioUrl: msg.audioUrl || null,
          videoUrl: msg.videoUrl || null,
          seenBy: [],
          deletedFor: [],
          viewerExpireAt: {},
          fullyDeleted: false
        };
        await setDoc(newMsgRef, data);
      }

      toast({ 
        title: "Messages Forwarded", 
        description: `Successfully forwarded ${messagesToForward.length} message(s) to #${selectedChannel.name}` 
      });
      onOpenChange(false);
      setSelectedChannel(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Forward Failed", description: e.message });
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Forward className="h-6 w-6 text-primary" />
            Forward Message
          </DialogTitle>
          <DialogDescription className="font-medium">
            Choose a community and channel to share this with.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search communities..." 
              className="pl-9 bg-muted/50 border-none rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-6">
              {communities?.map((community) => (
                <CommunitySection 
                  key={community.id} 
                  community={community} 
                  onSelect={setSelectedChannel}
                  selectedId={selectedChannel?.channelId}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {selectedChannel && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Hash className="h-3 w-3 text-primary" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest truncate">{selectedChannel.name}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              className="rounded-xl font-black px-6 shadow-lg shadow-primary/20" 
              disabled={!selectedChannel || isForwarding}
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

function CommunitySection({ community, onSelect, selectedId }: { community: any, onSelect: (chan: any) => void, selectedId?: string }) {
  const db = useFirestore();
  const channelsQuery = useMemoFirebase(() => query(collection(db, "communities", community.id, "channels")), [db, community.id]);
  const { data: channels } = useCollection(channelsQuery);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Avatar className="h-5 w-5 rounded-md">
          <AvatarImage src={community.icon} />
          <AvatarFallback className="text-[8px] bg-primary text-white">{community.name?.[0]}</AvatarFallback>
        </Avatar>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{community.name}</span>
      </div>
      <div className="space-y-1">
        {channels?.map(chan => (
          <button
            key={chan.id}
            onClick={() => onSelect({ communityId: community.id, channelId: chan.id, name: chan.name })}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
              selectedId === chan.id 
                ? "bg-primary/10 border-primary shadow-sm" 
                : "bg-background border-transparent hover:border-muted hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3">
              <Hash className={cn("h-4 w-4", selectedId === chan.id ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-bold", selectedId === chan.id ? "text-primary" : "text-foreground")}>{chan.name}</span>
            </div>
            {selectedId === chan.id && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in" />}
          </button>
        ))}
      </div>
    </div>
  );
}
