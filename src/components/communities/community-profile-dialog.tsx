
"use client";

import { useState } from "react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, CalendarDays, Globe, Maximize2, Shield, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommunityProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

export function CommunityProfileDialog({ open, onOpenChange, serverId }: CommunityProfileDialogProps) {
  const db = useFirestore();
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const serverRef = useMemoFirebase(() => (serverId ? doc(db, "communities", serverId) : null), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  if (!server) return null;

  const joinDate = server.createdAt 
    ? new Date(server.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : "Origin Date";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-background flex flex-col h-[90vh] max-h-[700px]">
          <DialogHeader className="p-6 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">{server.name} Profile</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Community overview and identity in the Duniya Verse.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="h-24 bg-primary w-full relative shrink-0">
              <div className="absolute -bottom-10 left-6">
                <button 
                  onClick={() => setIsZoomOpen(true)}
                  className="group relative h-24 w-24 rounded-[2rem] border-4 border-background shadow-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 bg-card"
                >
                  <Avatar className="h-full w-full rounded-none aspect-square">
                    <AvatarImage src={server.icon} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white text-3xl font-black">
                      {server.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="h-6 w-6 text-white" />
                  </div>
                </button>
              </div>
            </div>

            <div className="px-6 pt-14 pb-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">{server.name}</h3>
                  {server.isPublic && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent border-none text-[10px] font-black uppercase tracking-widest">
                      <Globe className="h-3 w-3 mr-1" /> Public
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">
                  {server.description || "A legendary community in the Duniya Verse."}
                </p>
              </div>

              <Separator className="my-6 opacity-50" />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Users className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Members</span>
                  </div>
                  <span className="text-xl font-black">{server.members?.length || 0}</span>
                </div>

                <div className="p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/10 transition-all flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Born On</span>
                  </div>
                  <span className="text-sm font-black">{joinDate}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Verse Security</span>
                  <span className="text-[11px] font-bold text-muted-foreground">Encryption Active & Identity Verified</span>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 bg-muted/30 border-t flex items-center justify-center shrink-0">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              <span>Verified Community</span>
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <span>Aniruddha ❤️</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{server.name} Icon Zoom</DialogTitle>
            <DialogDescription>Full-sized community icon view in original proportions.</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative"
            >
              {server.icon ? (
                <img 
                  src={server.icon} 
                  alt={server.name} 
                  className="max-w-full max-h-[85vh] rounded-[3rem] shadow-2xl object-contain"
                />
              ) : (
                <div className="w-64 h-64 bg-primary rounded-[3rem] flex items-center justify-center text-white text-8xl font-black shadow-2xl">
                  {server.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md rounded-full border border-border shadow-xl">
                <span className="text-xs font-black uppercase tracking-widest">{server.name}</span>
                <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
