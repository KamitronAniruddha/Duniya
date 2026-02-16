
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Ghost, Timer, Landmark, Globe, Shield, MessageSquare, Zap, Heart, Camera, Users, Lock, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  image: string;
  hint: string;
}

const VERSE_FEATURES: Feature[] = [
  {
    id: "identity",
    title: "Verse Identity",
    description: "Your persona is your signature. Experience high-fidelity profile syncing with real-time bio updates and unique handwriting authentication signatures.",
    icon: <Camera className="h-6 w-6" />,
    color: "bg-primary",
    image: "https://picsum.photos/seed/id1/600/400",
    hint: "person identity"
  },
  {
    id: "ghost",
    title: "Ghost Mode",
    description: "True privacy for the modern era. Enable disappearing messages that vanish after being viewed, protected by Verse-wide encryption.",
    icon: <Timer className="h-6 w-6" />,
    color: "bg-orange-500",
    image: "https://picsum.photos/seed/ghost/600/400",
    hint: "privacy timer"
  },
  {
    id: "genealogy",
    title: "Message Genealogy",
    description: "Trace the history of information. Every forwarded message includes its lineage, showing exactly where it originated and how it reached you.",
    icon: <Landmark className="h-6 w-6" />,
    color: "bg-indigo-500",
    image: "https://picsum.photos/seed/trace/600/400",
    hint: "history timeline"
  },
  {
    id: "intelligence",
    title: "Visual Intelligence",
    description: "Share thoughts on identities. Commenting on profiles reveals social depth, showing community reach and mutual connections instantly.",
    icon: <Sparkles className="h-6 w-6" />,
    color: "bg-pink-500",
    image: "https://picsum.photos/seed/intel/600/400",
    hint: "social intelligence"
  },
  {
    id: "discovery",
    title: "Duniya Discovery",
    description: "Explore public communities. A high-fidelity directory that lets you join new worlds with a single tap or secure invite codes.",
    icon: <Globe className="h-6 w-6" />,
    color: "bg-accent",
    image: "https://picsum.photos/seed/globe/600/400",
    hint: "world discovery"
  },
  {
    id: "whispers",
    title: "Whispers",
    description: "Private conversations within public spaces. Send messages visible only to specific participants inside any channel.",
    icon: <Ghost className="h-6 w-6" />,
    color: "bg-indigo-800",
    image: "https://picsum.photos/seed/whisper/600/400",
    hint: "private message"
  }
];

export function FeatureShowcaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeFeature, setActiveFeature] = useState(VERSE_FEATURES[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1000px] h-[90vh] p-0 border-none shadow-[0_32px_64px_rgba(0,0,0,0.4)] bg-background overflow-hidden flex flex-col rounded-[2.5rem]">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <DialogTitle className="text-4xl font-[900] tracking-tighter uppercase text-foreground leading-none">VERSE CAPABILITIES</DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-2">Duniya Technology Suite</DialogDescription>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl animate-float">
              <Zap className="h-8 w-8 text-primary fill-primary" />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 border-r bg-muted/20 p-4 shrink-0">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {VERSE_FEATURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFeature(f)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                      activeFeature.id === f.id ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-3",
                      activeFeature.id === f.id ? "bg-white/20" : "bg-muted-foreground/10"
                    )}>
                      {f.icon}
                    </div>
                    <span className="text-sm font-black uppercase tracking-tight">{f.title}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          <main className="flex-1 overflow-hidden relative bg-card/50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full flex flex-col p-10"
              >
                <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl mb-10 group">
                  <img 
                    src={activeFeature.image} 
                    alt={activeFeature.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    data-ai-hint={activeFeature.hint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                      <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">High-Fidelity Preview</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg", activeFeature.color)}>
                      {activeFeature.icon}
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase">{activeFeature.title}</h2>
                  </div>
                  <p className="text-lg text-muted-foreground font-medium leading-relaxed italic">
                    "{activeFeature.description}"
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                      <Zap className="h-5 w-5 text-primary mb-3" />
                      <h4 className="text-xs font-black uppercase tracking-widest mb-1">Performance</h4>
                      <p className="text-[11px] text-muted-foreground font-bold">Optimized for "WhatsApp-Fast" synchronization across all devices.</p>
                    </div>
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                      <Shield className="h-5 w-5 text-primary mb-3" />
                      <h4 className="text-xs font-black uppercase tracking-widest mb-1">Security</h4>
                      <p className="text-[11px] text-muted-foreground font-bold">Identity verified and protected by the Duniya Verse protocols.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <div className="p-6 bg-muted/30 border-t flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-md rounded-full border border-border shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">The Verse by Aniruddha</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
          </div>
          <Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest h-12 px-8" onClick={() => onOpenChange(false)}>
            Close Guide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
