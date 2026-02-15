
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, setDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Search, Forward, Loader2, CheckCircle2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messagesToForward: any[];
}

interface SelectedChannel {
  communityId: string;
  channelId: string;
  name: string;
}

export function ForwardDialog({ open, onOpenChange, messagesToForward }: ForwardDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<SelectedChannel[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  // Get user's communities
  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "communities"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);
  const { data: communities } = useCollection(communitiesQuery);

  const toggleChannelSelection = (channel: SelectedChannel) => {
    setSelectedChannels(prev => {
      const isAlreadySelected = prev.find(c => c.channelId === channel.channelId);
      if (isAlreadySelected) {
        return prev.filter(c => c.channelId !== channel.channelId);
      } else {
        return [...prev, channel];
      }
    });
  };

  const handleForward = async () => {
    if (selectedChannels.length === 0 || !user || !db || messagesToForward.length === 0) return;
    setIsForwarding(true);

    try {
      // Forward to each selected channel
      for (const channel of selectedChannels) {
        for (const msg of messagesToForward) {
          const newMsgRef = doc(collection(db, "communities", channel.communityId, "channels", channel.channelId, "messages"));
          const data = {
            id: newMsgRef.id,
            channelId: channel.channelId,
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
      }

      toast({ 
        title: "Messages Forwarded", 
        description: `Successfully forwarded ${messagesToForward.length} message(s) to ${selectedChannels.length} channel(s).` 
      });
      onOpenChange(false);
      setSelectedChannels([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Forward Failed", description: e.message });
    } finally {
      setIsForwarding(false);
    }
  };

  const filteredCommunities = communities?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
            <Forward className="h-6 w-6 text-primary" />
            Forward Message
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground">
            Select one or more channels to share this with.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search communities..." 
              className="pl-9 bg-muted/50 border-none rounded-xl text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedChannels.length > 0 && (
            <ScrollArea className="max-h-20 w-full mb-2">
              <div className="flex flex-wrap gap-1.5 p-1">
                {selectedChannels.map(chan => (
                  <Badge key={chan.channelId} variant="secondary" className="flex items-center gap-1 py-1 px-2 rounded-lg bg-primary/10 text-primary border-primary/20 animate-in zoom-in-95">
                    <Hash className="h-3 w-3" />
                    <span className="text-[10px] font-bold">{chan.name}</span>
                    <button onClick={() => toggleChannelSelection(chan)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          )}

          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-6">
              {filteredCommunities?.map((community) => (
                <CommunitySection 
                  key={community.id} 
                  community={community} 
                  onSelect={toggleChannelSelection}
                  selectedIds={selectedChannels.map(c => c.channelId)}
                />
              ))}
              {filteredCommunities?.length === 0 && (
                <div className="text-center py-10 opacity-30 italic text-sm">
                  No communities found.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
               {selectedChannels.length} Target(s) selected
             </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              className="rounded-xl font-black px-6 shadow-lg shadow-primary/20" 
              disabled={selectedChannels.length === 0 || isForwarding}
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

function CommunitySection({ community, onSelect, selectedIds }: { community: any, onSelect: (chan: SelectedChannel) => void, selectedIds: string[] }) {
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
              onClick={() => onSelect({ communityId: community.id, channelId: chan.id, name: chan.name })}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                isSelected 
                  ? "bg-primary/10 border-primary shadow-sm" 
                  : "bg-background border-transparent hover:border-muted hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <Hash className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-bold", isSelected ? "text-primary" : "text-foreground")}>{chan.name}</span>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
