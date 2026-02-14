
"use client";

import { useState, useEffect } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, Timestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Hash, Copy, Check, Globe, Clock, TimerOff, Timer } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ServerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

const BROADCAST_DURATIONS = [
  { label: "30 Seconds", value: "30s", ms: 30 * 1000 },
  { label: "10 Minutes", value: "10m", ms: 10 * 60 * 1000 },
  { label: "1 Hour", value: "1h", ms: 60 * 60 * 1000 },
  { label: "1 Day", value: "1d", ms: 24 * 60 * 60 * 1000 },
  { label: "7 Days", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 Days", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
];

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: "off" },
  { label: "24 Hours", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "90 Days", value: "90d" },
];

export function ServerSettingsDialog({ open, onOpenChange, serverId }: ServerSettingsDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "communities", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [isBroadcasted, setIsBroadcasted] = useState(false);
  const [broadcastDuration, setBroadcastDuration] = useState("1d");
  const [disappearingDuration, setDisappearingDuration] = useState("off");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (server) {
      setName(server.name || "");
      setIcon(server.icon || "");
      setDescription(server.description || "");
      setIsBroadcasted(server.isBroadcasted || false);
      setDisappearingDuration(server.disappearingMessagesDuration || "off");
    }
  }, [server]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serverRef) return;
    setIsLoading(true);

    try {
      let broadcastExpiry = server?.broadcastExpiry || null;
      
      if (isBroadcasted) {
        const duration = BROADCAST_DURATIONS.find(d => d.value === broadcastDuration);
        if (duration) {
          const expiryDate = new Date(Date.now() + duration.ms);
          broadcastExpiry = Timestamp.fromDate(expiryDate);
        }
      }

      updateDocumentNonBlocking(serverRef, {
        name: name.trim(),
        icon: icon.trim(),
        description: description.trim(),
        isBroadcasted: isBroadcasted,
        isPublic: isBroadcasted, // Link public directory with broadcasting
        broadcastExpiry: broadcastExpiry,
        disappearingMessagesDuration: disappearingDuration,
      });
      
      toast({ 
        title: "Community updated", 
        description: "Settings have been saved successfully."
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (server?.joinCode) {
      navigator.clipboard.writeText(server.joinCode);
      setCopied(true);
      toast({ title: "Code Copied", description: "5-digit join code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col h-[90vh] max-h-[700px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Community Settings</DialogTitle>
          <DialogDescription>Manage your community details, privacy, and discovery.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-2 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sname">Community Name</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="sname" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sdesc">Description</Label>
                  <Input id="sdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sicon">Icon URL</Label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="sicon" className="pl-9" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Privacy: Disappearing Messages */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold">Privacy: Disappearing Messages</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  When enabled, new messages sent in this community will disappear for everyone after the specified duration.
                </p>
                <Select value={disappearingDuration} onValueChange={setDisappearingDuration}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISAPPEARING_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Discovery: Duniya */}
              <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent rounded-lg">
                      <Globe className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-sm font-bold">Broadcast to Duniya</Label>
                      <p className="text-[10px] text-muted-foreground">Public directory visibility.</p>
                    </div>
                  </div>
                  <Switch checked={isBroadcasted} onCheckedChange={setIsBroadcasted} />
                </div>

                {isBroadcasted && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Broadcast Duration</Label>
                    <Select value={broadcastDuration} onValueChange={setBroadcastDuration}>
                      <SelectTrigger className="w-full bg-background h-9 text-xs">
                        <Clock className="h-3 w-3 mr-2 text-primary" />
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {BROADCAST_DURATIONS.map(d => (
                          <SelectItem key={d.value} value={d.value} className="text-xs">
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="pt-2 space-y-3">
                <div className="p-3 bg-muted rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Join Code (5 Digits)</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={copyCode}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="text-2xl font-black tracking-[0.5em] text-center font-mono py-2 bg-background rounded-lg border">
                    {server?.joinCode || "-----"}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-2 shrink-0 border-t mt-auto bg-background z-10">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
