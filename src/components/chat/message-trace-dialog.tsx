
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { History, Landmark, ArrowDown, User, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ForwardHop {
  communityName: string;
  viaCommunity?: string;
  senderName: string;
  timestamp: string;
  isInitial?: boolean;
}

interface MessageTraceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: ForwardHop[];
}

export function MessageTraceDialog({ open, onOpenChange, chain }: MessageTraceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-background max-h-[85vh] flex flex-col">
        <DialogHeader className="p-6 md:p-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent shrink-0 relative">
          <DialogTitle className="text-2xl md:text-3xl font-black tracking-tighter flex items-center gap-3 text-foreground">
            <History className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            Genealogy
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground text-xs md:text-sm">
            The journey of this message through the Verse.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 custom-scrollbar">
          <div className="relative space-y-8 py-6 pr-4">
            <div className="absolute left-[15px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-primary/40 via-muted to-muted/20" />

            {chain.map((hop, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === chain.length - 1;
              const timeStr = hop.timestamp ? formatDistanceToNow(new Date(hop.timestamp), { addSuffix: true }) : "Unknown time";

              return (
                <div key={idx} className="relative pl-10 group animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className={cn(
                    "absolute left-0 top-1 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center transition-all shadow-md z-10",
                    isFirst ? "bg-primary text-white scale-110" : "bg-muted text-muted-foreground",
                    isLast && "bg-green-500 text-white"
                  )}>
                    {isFirst ? <Landmark className="h-3.5 w-3.5" /> : isLast ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  </div>

                  <div className={cn(
                    "p-4 rounded-2xl border transition-all duration-300",
                    isFirst ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/10 border-transparent hover:border-muted",
                    isLast && "bg-green-500/5 border-green-500/20"
                  )}>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                          {isFirst ? "ROOT CREATION" : isLast ? "LATEST HOP" : `RELAY #${idx}`}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground">
                          <Clock className="h-2 w-2" />
                          {timeStr}
                        </div>
                      </div>

                      <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                        <Landmark className="h-3.5 w-3.5 opacity-50" />
                        {hop.communityName}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Sent by <span className="text-foreground font-bold">{hop.senderName}</span></span>
                      </div>

                      {hop.viaCommunity && (
                        <div className="mt-1 pt-1 border-t border-muted-foreground/10 text-[9px] italic text-muted-foreground">
                          Relayed from {hop.viaCommunity}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-muted/20 border-t flex items-center justify-center shrink-0">
           <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            <span>Trace Verified by Duniya</span>
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <span>Aniruddha ❤️</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
