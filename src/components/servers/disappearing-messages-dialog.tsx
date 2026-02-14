
"use client";

import { useState, useEffect } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Timer, TimerOff, CheckCircle2 } from "lucide-react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DisappearingMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: "off", description: "Messages are stored forever until deleted manually." },
  { label: "24 Hours", value: "24h", description: "Keep the chat fresh. Messages vanish after a day." },
  { label: "7 Days", value: "7d", description: "The perfect balance for weekly catch-ups." },
  { label: "90 Days", value: "90d", description: "Extended history, but still ephemeral." },
];

export function DisappearingMessagesDialog({ open, onOpenChange, serverId }: DisappearingMessagesDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const serverRef = useMemoFirebase(() => doc(db, "servers", serverId), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState("off");

  useEffect(() => {
    if (server) {
      setDuration(server.disappearingMessagesDuration || "off");
    }
  }, [server]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      updateDocumentNonBlocking(serverRef, {
        disappearingMessagesDuration: duration,
      });
      
      toast({ 
        title: duration === "off" ? "Disappearing messages disabled" : "Disappearing messages enabled",
        description: duration === "off" ? "Chat history will now be permanent." : `New messages will vanish after ${duration}.`
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const currentOption = DISAPPEARING_OPTIONS.find(opt => opt.value === duration);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Disappearing Messages
          </DialogTitle>
          <DialogDescription>
            For more privacy and storage, new messages will disappear from this server for everyone after the selected duration.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {DISAPPEARING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group",
                    duration === opt.value 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-transparent hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={cn(
                      "font-bold text-sm",
                      duration === opt.value ? "text-primary" : "text-foreground"
                    )}>
                      {opt.label}
                    </span>
                    {duration === opt.value && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading} className="flex-1">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Timer className="h-4 w-4 mr-2" />}
            Set Duration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
