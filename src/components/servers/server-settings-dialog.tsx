"use client";

import { useState, useEffect } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Hash } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface ServerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

export function ServerSettingsDialog({ open, onOpenChange, serverId }: ServerSettingsDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const serverRef = useMemoFirebase(() => doc(db, "servers", serverId), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  useEffect(() => {
    if (server) {
      setName(server.name || "");
      setIcon(server.icon || "");
    }
  }, [server]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);

    try {
      updateDocumentNonBlocking(serverRef, {
        name: name.trim(),
        icon: icon.trim(),
      });
      toast({ title: "Server updated" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Server Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sname">Server Name</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="sname" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sicon">Icon URL</Label>
            <div className="relative">
              <Camera className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="sicon" className="pl-9" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="pt-4 space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Server ID (Share to invite friends)</Label>
            <code className="block p-2 bg-muted rounded text-xs break-all font-mono select-all">
              {serverId}
            </code>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}