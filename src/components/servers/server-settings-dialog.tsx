"use client";

import React, { useState, useEffect, memo } from "react";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc, Timestamp, writeBatch, arrayRemove } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Hash, Copy, Check, Globe, Clock, Timer, Trash2, AlertTriangle } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

export const ServerSettingsDialog = memo(function ServerSettingsDialog({ open, onOpenChange, serverId }: ServerSettingsDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "communities", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [isBroadcasted, setIsBroadcasted] = useState(false);
  const [broadcastDuration, setBroadcastDuration] = useState("1d");
  const [disappearingDuration, setDisappearingDuration] = useState("off");
  const [copied, setCopied] = useState(false);

  const isOwner = server?.ownerId === user?.uid;

  useEffect(() => {
    if (server && open) {
      setName(server.name || "");
      setIcon(server.icon || "");
      setDescription(server.description || "");
      setIsBroadcasted(server.isBroadcasted || false);
      setDisappearingDuration(server.disappearingMessagesDuration || "off");
    }
  }, [server, open]);

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
        isPublic: isBroadcasted,
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

  const handleDeleteCommunity = async () => {
    if (!serverRef || !user || !isOwner) return;
    setIsDeleting(true);

    try {
      const batch = writeBatch(db);
      
      // 1. Delete main community doc
      // This will instantly remove the community from all users' sidebars 
      // because the sidebars query for communities that exist AND contain the user ID.
      batch.delete(serverRef);
      
      // 2. Remove from owner's serverIds explicitly
      const userRef = doc(db, "users", user.uid);
      batch.update(userRef, {
        serverIds: arrayRemove(serverId)
      });

      await batch.commit();
      
      toast({ 
        title: "Community Dissolved", 
        description: `${name} has been removed from the Verse.` 
      });
      
      onOpenChange(false);
      window.location.href = "/"; // Force redirect to Verse Home
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
      setIsDeleting(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] flex flex-col h-[90vh] max-h-[750px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Community Settings</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Manage identity, privacy, and Verse discovery.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-8 px-8 py-2 pb-10">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sname" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Name</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <Input id="sname" className="pl-9 bg-muted/40 border-none rounded-2xl h-12 font-bold focus:ring-2 focus:ring-primary/20 transition-all" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sdesc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                    <Input id="sdesc" className="bg-muted/40 border-none rounded-2xl h-12 font-medium" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sicon" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Icon URL</Label>
                    <div className="relative">
                      <Camera className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <Input id="sicon" className="pl-9 bg-muted/40 border-none rounded-2xl h-12" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Ghost Mode</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic px-1">
                    When enabled, new messages sent in this community will disappear for everyone after the specified duration.
                  </p>
                  <Select value={disappearingDuration} onValueChange={setDisappearingDuration}>
                    <SelectTrigger className="w-full bg-muted/40 border-none h-12 rounded-2xl font-bold">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {DISAPPEARING_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm font-bold">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-4 p-4 bg-primary/5 rounded-[2rem] border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent rounded-xl shadow-lg shadow-accent/20">
                        <Globe className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <Label className="text-sm font-black uppercase tracking-tight">Broadcast</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Public directory visibility.</p>
                      </div>
                    </div>
                    <Switch checked={isBroadcasted} onCheckedChange={setIsBroadcasted} />
                  </div>

                  {isBroadcasted && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label className="text-[9px] uppercase font-black text-primary mb-2 block tracking-widest">Broadcast Duration</Label>
                      <Select value={broadcastDuration} onValueChange={setBroadcastDuration}>
                        <SelectTrigger className="w-full bg-background/50 border-none h-10 rounded-xl text-xs font-bold">
                          <Clock className="h-3 w-3 mr-2 text-primary" />
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                          {BROADCAST_DURATIONS.map(d => (
                            <SelectItem key={d.value} value={d.value} className="text-xs font-bold">
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 space-y-4">
                  <div className="p-4 bg-muted/40 rounded-[2rem] border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] ml-1">Join Code</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-xl hover:bg-background" 
                        onClick={copyCode}
                      >
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="text-3xl font-black tracking-[0.4em] text-center font-mono py-4 bg-background/80 rounded-2xl border-2 border-dashed border-muted-foreground/20">
                      {server?.joinCode || "-----"}
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <>
                    <Separator className="opacity-50" />
                    <div className="pt-2">
                      <div className="p-6 bg-destructive/5 rounded-[2.5rem] border border-destructive/10 space-y-4">
                        <div className="flex items-center gap-3 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          <h4 className="text-sm font-black uppercase tracking-widest">Danger Zone</h4>
                        </div>
                        <p className="text-[11px] text-destructive/70 leading-relaxed font-medium italic">
                          Permanently dissolve this community and remove all data from the Verse. This action cannot be reversed.
                        </p>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          className="w-full rounded-2xl h-12 font-black shadow-lg shadow-destructive/20 uppercase tracking-widest gap-2"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Dissolve Community
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-8 pt-4 shrink-0 border-t bg-muted/20 z-10 flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="ghost" className="flex-1 rounded-xl font-bold h-12" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 rounded-xl font-black h-12 shadow-lg shadow-primary/20" disabled={isLoading || !name.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="h-16 w-16 bg-destructive/10 rounded-[1.5rem] flex items-center justify-center mb-4 text-destructive mx-auto">
              <Trash2 className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase text-center">DISSOLVE COMMUNITY?</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium text-muted-foreground">
              This will permanently remove <span className="text-foreground font-black">"{name}"</span> from the Verse. All messages, channels, and member connections will be severed instantly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-2xl font-bold h-14 flex-1 border-none bg-muted/50">Keep Community</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCommunity}
              disabled={isDeleting}
              className="rounded-2xl font-black h-14 flex-1 bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/20 uppercase tracking-widest"
            >
              {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
