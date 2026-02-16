"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { History, Landmark, ArrowDown, User, Clock, CheckCircle2, Hash, Zap, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { type ForwardHop } from "./message-bubble";
import { CreatorFooter } from "@/components/creator-footer";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageTraceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: ForwardHop[];
}

export function MessageTraceDialog({ open, onOpenChange, chain }: MessageTraceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] w-[95vw] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-[0_32px_64px_rgba(0,0,0,0.4)] bg-background h-[85vh] max-h-[85vh] flex flex-col z-[2000]">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent shrink-0 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Verse Intelligence Suite</span>
            </div>
            <Activity className="h-4 w-4 text-primary/40" />
          </div>
          <DialogTitle className="text-3xl md:text-4xl font-[900] tracking-tighter flex items-center gap-3 text-foreground leading-none uppercase">
            <History className="h-8 w-8 text-primary animate-spin-slow" />
            Genealogy
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground text-xs md:text-sm mt-2 italic">
            "Tracing the digital lineage across the Duniya Verse."
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full">
            <div className="relative py-10 px-6 md:px-10">
              {/* Animated Glowing Path Line */}
              <div className="absolute left-[43px] md:left-[59px] top-12 bottom-12 w-[3px] bg-muted/20 rounded-full" />
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: "calc(100% - 96px)" }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                className="absolute left-[43px] md:left-[59px] top-12 w-[3px] bg-gradient-to-b from-primary via-accent to-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] z-0"
              />

              <div className="space-y-10 relative z-10">
                {chain.map((hop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === chain.length - 1;
                  const timeStr = hop.timestamp ? formatDistanceToNow(new Date(hop.timestamp), { addSuffix: true }) : "Unknown time";

                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.15, type: "spring", stiffness: 100 }}
                      className="relative pl-12 md:pl-16 group"
                    >
                      {/* Interactive Node Point */}
                      <motion.div 
                        whileHover={{ scale: 1.2 }}
                        className={cn(
                          "absolute left-0 top-1 h-10 w-10 md:h-12 md:w-12 rounded-2xl border-4 border-background flex items-center justify-center transition-all shadow-xl z-20",
                          isFirst ? "bg-primary text-white" : isLast ? "bg-green-500 text-white" : "bg-card text-muted-foreground border-muted/30"
                        )}
                      >
                        {isFirst ? (
                          <Zap className="h-4 w-4 md:h-5 md:w-5 fill-current" />
                        ) : isLast ? (
                          <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
                        ) : (
                          <ArrowDown className="h-4 w-4 md:h-5 md:w-5" />
                        )}
                      </motion.div>

                      {/* Hop Card Content */}
                      <div className={cn(
                        "p-5 rounded-[1.75rem] border transition-all duration-500 relative overflow-hidden group-hover:scale-[1.02] group-hover:shadow-2xl",
                        isFirst 
                          ? "bg-primary/5 border-primary/20 shadow-primary/5" 
                          : isLast 
                            ? "bg-green-500/5 border-green-500/20 shadow-green-500/5"
                            : "bg-muted/10 border-transparent hover:border-muted shadow-sm"
                      )}>
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-[0.08] transition-opacity">
                          <Landmark className="h-16 w-16" />
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border",
                              isFirst ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-border/50 text-muted-foreground"
                            )}>
                              {isFirst ? "Origin Point" : isLast ? "Current Destination" : `Verse Relay #${idx}`}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter">
                              <Clock className="h-3 w-3" />
                              {timeStr}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <h4 className="text-base font-black text-foreground flex items-center gap-2 tracking-tight uppercase">
                              {hop?.communityName || "Duniya Verse"}
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background/50 rounded-lg border border-border/50 text-[10px] font-black text-primary uppercase tracking-widest">
                                <Hash className="h-3 w-3" />
                                <span>{hop?.channelName || "General"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 pt-2 mt-1 border-t border-border/30">
                            <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              Identified: <span className="text-foreground font-black uppercase tracking-tight">@{hop.senderName}</span>
                            </span>
                          </div>

                          {hop.viaCommunity && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2 p-2 bg-black/5 rounded-xl text-[9px] font-bold italic text-muted-foreground/70 flex items-center gap-2 border border-transparent hover:border-border/50 transition-all"
                            >
                              <div className="h-1 w-1 rounded-full bg-primary" />
                              Relayed from {hop.viaCommunity} {' > '} #{hop.viaChannel}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 bg-muted/20 border-t flex items-center justify-center shrink-0">
          <CreatorFooter />
        </div>
      </DialogContent>
    </Dialog>
  );
}