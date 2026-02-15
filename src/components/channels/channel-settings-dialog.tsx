"use client";

import { useState, useEffect } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Hash, Check, X } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  channelId: string;
}

export function ChannelSettingsDialog({ open, onOpenChange, serverId, channelId }: ChannelSettingsDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  
  // Channels are nested within communities: /communities/{communityId}/channels/{channelId}
  const channelRef = useMemoFirebase(() => 
    serverId && channelId ? doc(db, "communities", serverId, "channels", channelId) : null, 
    [db, serverId, channelId]
  );
  
  const { data: channel } = useDoc(channelRef);

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (channel && open) {
      setName(channel.name || "");
    }
  }, [channel, open]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !channelRef) return;
    setIsLoading(true);

    try {
      updateDocumentNonBlocking(channelRef, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      toast({ title: "Channel renamed", description: `The channel is now known as #${name.trim().toLowerCase()}` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-2xl font-black tracking-tight">Channel Settings</DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground">
            Update the identity of this channel in the Verse.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="p-8 pt-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="chname" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Channel Name</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                id="chname" 
                className="pl-9 h-12 bg-muted/40 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 transition-all" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="general"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1 rounded-xl font-bold h-12" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 rounded-xl font-black h-12 shadow-lg shadow-primary/20" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </form>

        <div className="p-4 bg-muted/20 border-t flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            <span>Identity Verified by Duniya</span>
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <span>Aniruddha ❤️</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
