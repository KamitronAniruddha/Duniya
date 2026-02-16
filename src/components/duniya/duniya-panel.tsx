
"use client";

import { useState, useMemo } from "react";
import { Globe, Search, Sparkles, Users, Loader2, Plus, ArrowRight, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DuniyaPanel({ onJoinSuccess }: { onJoinSuccess: (serverId: string) => void }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Fetch all communities marked as public
  const publicCommunitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "communities"), where("isPublic", "==", true));
  }, [db]);

  const { data: rawCommunities, isLoading } = useCollection(publicCommunitiesQuery);

  // Filter out communities the user is already a member of
  const discoveryCommunities = useMemo(() => {
    if (!rawCommunities || !user) return [];
    return rawCommunities.filter(c => !c.members?.includes(user.uid));
  }, [rawCommunities, user?.uid]);

  // Apply search filtering
  const filteredCommunities = useMemo(() => {
    if (!discoveryCommunities) return [];
    return discoveryCommunities.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [discoveryCommunities, searchQuery]);

  const handleJoin = async (community: any) => {
    if (!user || !db || joiningId) return;
    setJoiningId(community.id);

    try {
      const batch = writeBatch(db);
      
      // Update community members
      batch.update(doc(db, "communities", community.id), {
        members: arrayUnion(user.uid)
      });

      // Update user server list
      batch.update(doc(db, "users", user.uid), {
        serverIds: arrayUnion(community.id)
      });

      // Create tracking record for membership
      batch.set(doc(db, "communities", community.id, "members", user.uid), {
        id: user.uid,
        communityId: community.id,
        userId: user.uid,
        role: "member",
        joinedAt: new Date().toISOString()
      });

      await batch.commit();
      
      toast({
        title: "Joined Community!",
        description: `Welcome to ${community.name}. Let's Karo Chutiyapaa!`,
      });
      
      onJoinSuccess(community.id);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Join Error",
        description: e.message || "Could not join community.",
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/5 overflow-hidden font-body">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-xl text-foreground uppercase tracking-tighter leading-none">Duniya</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Discovery Hub</p>
          </div>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search communities..." 
            className="pl-9 bg-muted/40 border-none rounded-xl h-10 text-foreground font-bold" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Directory</p>
            </div>
          ) : filteredCommunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="p-12 bg-primary/5 rounded-[3.5rem] relative z-10 mb-8">
                <Globe className="h-24 w-24 text-primary/10" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter uppercase text-foreground">Nothing found in this Verse</h3>
              <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] leading-relaxed opacity-60 mt-2">
                {searchQuery ? `No public communities matching "${searchQuery}"` : "Try creating your own community to start the journey!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredCommunities.map((community) => (
                  <motion.div
                    key={community.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group rounded-[2rem] border-none shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] bg-card overflow-hidden">
                      <div className="h-24 bg-gradient-to-br from-primary to-accent relative">
                        <div className="absolute -bottom-10 left-6">
                          <Avatar className="h-20 w-20 border-4 border-card shadow-xl group-hover:rotate-3 transition-transform">
                            <AvatarImage src={community.icon} className="object-cover" />
                            <AvatarFallback className="bg-primary text-white text-3xl font-black uppercase">
                              {community.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <CardHeader className="pt-12 pb-2">
                        <div className="flex items-center justify-between mb-1">
                          <CardTitle className="text-xl font-black uppercase tracking-tight truncate mr-2">
                            {community.name}
                          </CardTitle>
                          <div className="flex items-center gap-1 text-primary">
                            <Users className="h-3 w-3" />
                            <span className="text-xs font-black">{community.members?.length || 0}</span>
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2 text-xs font-medium leading-relaxed italic min-h-[32px]">
                          {community.description || "A legendary community in the Duniya Verse."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2 pb-6">
                        <Button 
                          className="w-full h-12 rounded-2xl font-black uppercase tracking-widest gap-2 group/btn shadow-lg shadow-primary/20"
                          onClick={() => handleJoin(community)}
                          disabled={joiningId === community.id}
                        >
                          {joiningId === community.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Join Verse
                              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-muted/20 border-t flex items-center justify-center shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 bg-background/50 backdrop-blur-md rounded-full border border-border shadow-sm">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Made by Aniruddha with love</span>
          <Heart className="h-2.5 w-2.5 text-red-500 fill-red-500" />
        </div>
      </div>
    </div>
  );
}
