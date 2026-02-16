"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Ghost, Timer, Landmark, Globe, Shield, MessageSquare, Zap, Heart, Camera, Users, Lock, Share2, Activity, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface Feature {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  color: string;
  image: string;
  hint: string;
  performanceNote: string;
  securityNote: string;
}

const VERSE_FEATURES: Feature[] = [
  {
    id: "identity",
    title: "Verse Identity",
    description: "Your persona is your unique signature in the digital world.",
    longDescription: "Experience high-fidelity profile synchronization powered by the Duniya Identity Protocol. Every user receives a unique handwriting authentication signature (Ani or Sanu) that draws itself in real-time. Profiles support Base64 high-resolution avatars, dynamic bios, and instant 'On-Screen' status tracking that stays synchronized across all your devices with <50ms latency.",
    icon: <Fingerprint className="h-6 w-6" />,
    color: "bg-primary",
    image: PlaceHolderImages.find(img => img.id === 'feature-identity')?.imageUrl || "",
    hint: "biometric scan",
    performanceNote: "Instant profile sync with high-fidelity caching.",
    securityNote: "End-to-end encrypted identity metadata."
  },
  {
    id: "ghost",
    title: "Ghost Mode",
    description: "True ephemeral privacy designed for the modern era.",
    longDescription: "Enable vanishing interactions with Ghost Mode. Messages sent in this state are governed by a strict 'Seen-to-Vanish' timer. Once a participant views the message, a countdown begins before the content is permanently purged from the Verse. This ensures that sensitive conversations leave zero digital footprint, protected by our custom non-recoverable deletion protocol.",
    icon: <Ghost className="h-6 w-6" />,
    color: "bg-orange-500",
    image: PlaceHolderImages.find(img => img.id === 'feature-ghost')?.imageUrl || "",
    hint: "digital privacy",
    performanceNote: "Zero-lag automated purge cycles.",
    securityNote: "Secure ephemeral state management."
  },
  {
    id: "genealogy",
    title: "Message Genealogy",
    description: "Trace the lineage and history of every piece of information.",
    longDescription: "Stop misinformation at its root. Message Genealogy allows you to 'Trace' any forwarded content back to its origin. See a high-fidelity vertical timeline of every community, channel, and sender that touched the message. It includes recursive hop-tracing and precise 'Time-Distance' calculations, showing you exactly how long ago the information originated.",
    icon: <Landmark className="h-6 w-6" />,
    color: "bg-indigo-500",
    image: PlaceHolderImages.find(img => img.id === 'feature-genealogy')?.imageUrl || "",
    hint: "network history",
    performanceNote: "Recursive hop-tracing optimized for speed.",
    securityNote: "Verified source-validation algorithms."
  },
  {
    id: "intelligence",
    title: "Visual Intelligence",
    description: "Deep social insights through identity interaction.",
    longDescription: "Duniya goes beyond standard profiles. Our Visual Intelligence suite allows you to 'Share Thoughts' on any identity. When you comment on a profile picture, the Verse automatically calculates social depth metrics: Total Community Reach and Mutual Verse Connections. This data is captured as a permanent intelligence snapshot within the chat thread for all participants.",
    icon: <Sparkles className="h-6 w-6" />,
    color: "bg-pink-500",
    image: PlaceHolderImages.find(img => img.id === 'feature-intelligence')?.imageUrl || "",
    hint: "social data",
    performanceNote: "Real-time cross-community calculation.",
    securityNote: "Privacy-preserving mutual lookup logic."
  },
  {
    id: "discovery",
    title: "Duniya Discovery",
    description: "Explore a universe of public and private worlds.",
    longDescription: "The Discovery Hub is your gateway to new communities. Browse through a high-fidelity directory of public 'Verses' or use secure 5-digit Join Codes to enter private spaces. Our 'WhatsApp-Fast' auto-routing ensures that as soon as you join or switch communities, you land directly in the primary conversation with zero extra clicks.",
    icon: <Globe className="h-6 w-6" />,
    color: "bg-emerald-500",
    image: PlaceHolderImages.find(img => img.id === 'feature-discovery')?.imageUrl || "",
    hint: "community universe",
    performanceNote: "Paginated directory for instant loading.",
    securityNote: "Multi-factor join-code validation."
  },
  {
    id: "whispers",
    title: "Whispers",
    description: "Private sub-contexts within public conversation streams.",
    longDescription: "Whispers enable the power of Direct Messaging inside any public channel. Send a message that is only visible to you and one other specific participant. This creates a secure, private sub-context that doesn't disrupt the flow of the main group, allowing for high-fidelity side-conversations that are completely hidden from other members by the rendering engine.",
    icon: <Lock className="h-6 w-6" />,
    color: "bg-indigo-800",
    image: PlaceHolderImages.find(img => img.id === 'feature-whispers')?.imageUrl || "",
    hint: "encrypted secret",
    performanceNote: "Selective visibility rendering engine.",
    securityNote: "Participant-only data visibility rules."
  }
];

export function FeatureShowcaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeFeature, setActiveFeature] = useState(VERSE_FEATURES[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1100px] h-[90vh] p-0 border-none shadow-[0_32px_64px_rgba(0,0,0,0.4)] bg-background overflow-hidden flex flex-col rounded-[2.5rem]">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Duniya Technology Suite</span>
              </div>
              <DialogTitle className="text-4xl font-[900] tracking-tighter uppercase text-foreground leading-none">VERSE CAPABILITIES</DialogTitle>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl animate-float">
              <Zap className="h-8 w-8 text-primary fill-primary" />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Detailed Sidebar */}
          <aside className="w-80 border-r bg-muted/20 shrink-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 px-4 py-6">
              <div className="space-y-3 pr-4">
                {VERSE_FEATURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFeature(f)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group relative",
                      activeFeature.id === f.id ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-3 shadow-sm",
                      activeFeature.id === f.id ? "bg-white/20" : "bg-background border border-border"
                    )}>
                      {f.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black uppercase tracking-tight truncate">{f.title}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest opacity-60 truncate",
                        activeFeature.id === f.id ? "text-white" : "text-primary"
                      )}>
                        {f.id === 'identity' ? 'Security Protocol' : 'Performance Plus'}
                      </span>
                    </div>
                    {activeFeature.id === f.id && (
                      <motion.div layoutId="active-indicator" className="absolute -left-2 w-1 h-8 bg-white rounded-r-full" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Detailed Content View */}
          <main className="flex-1 overflow-hidden relative bg-card/50 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full flex flex-col"
              >
                <ScrollArea className="flex-1">
                  <div className="p-10 space-y-10">
                    {/* Visual Media Section */}
                    <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl group">
                      <img 
                        src={activeFeature.image} 
                        alt={activeFeature.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        data-ai-hint={activeFeature.hint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 w-fit">
                          <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">High-Fidelity Preview</span>
                        </div>
                        <h3 className="text-white text-3xl font-black mt-4 uppercase tracking-tighter">{activeFeature.title} Visual</h3>
                      </div>
                    </div>

                    {/* Detailed Intelligence Section */}
                    <div className="space-y-8 max-w-3xl">
                      <div className="flex items-center gap-6">
                        <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl", activeFeature.color)}>
                          {activeFeature.icon}
                        </div>
                        <div className="flex flex-col">
                          <h2 className="text-5xl font-[900] tracking-tighter uppercase leading-none">{activeFeature.title}</h2>
                          <p className="text-primary text-sm font-bold uppercase tracking-[0.2em] mt-2 italic">"{activeFeature.description}"</p>
                        </div>
                      </div>

                      <div className="p-8 bg-muted/30 rounded-[2.5rem] border border-border/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Activity className="h-20 w-20 text-primary" />
                        </div>
                        <p className="text-lg text-muted-foreground font-medium leading-relaxed relative z-10">
                          {activeFeature.longDescription}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 pt-4 pb-10">
                        <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-sm hover:shadow-md transition-all group/stat">
                          <div className="flex items-center gap-3 mb-4">
                            <Zap className="h-6 w-6 text-primary group-hover/stat:animate-bounce" />
                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">High Performance</h4>
                          </div>
                          <p className="text-sm text-muted-foreground font-bold leading-snug">
                            {activeFeature.performanceNote}
                          </p>
                        </div>
                        <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-sm hover:shadow-md transition-all group/stat">
                          <div className="flex items-center gap-3 mb-4">
                            <Shield className="h-6 w-6 text-primary group-hover/stat:rotate-12 transition-transform" />
                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">Verse Security</h4>
                          </div>
                          <p className="text-sm text-muted-foreground font-bold leading-snug">
                            {activeFeature.securityNote}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <div className="p-6 bg-muted/30 border-t flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center">Made by Aniruddha with love ❤️</span>
          <Button variant="ghost" className="rounded-2xl font-black uppercase tracking-widest h-14 px-10 hover:bg-primary hover:text-white transition-all shadow-xl hover:shadow-primary/20" onClick={() => onOpenChange(false)}>
            Close Guide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}