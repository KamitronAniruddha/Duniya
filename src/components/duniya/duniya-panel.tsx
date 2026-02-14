
"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, writeBatch } from "firebase/firestore";
import { Globe, Search, Users, Loader2, Plus, Check, AlertCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function DuniyaPanel({ onJoinSuccess }: { onJoinSuccess: (serverId: string) => void }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const publicCommunitiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "communities"),
      where("isPublic", "==", true)
    );
  }, [db, user?.uid]);

  const { data: communities, isLoading, error } = useCollection(publicCommunitiesQuery);

  const filteredCommunities = useMemo(() => {
    if (!communities) return [];
    return communities.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [communities, searchQuery]);

  const handleJoin = async (community: any) => {
    if (!user || !db) return;
    setJoiningId(community.id);

    try {
      if (community.members?.includes(user.uid)) {
        onJoinSuccess(community.id);
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, "communities", community.id), {
        members: arrayUnion(user.uid)
      });
      batch.set(doc(db, "communities", community.id, "members", user.uid), {
        id: user.uid,
        communityId: community.id,
        userId: user.uid,
        role: "member",
        joinedAt: new Date().toISOString()
      });
      batch.update(doc(db, "users", user.uid), {
        serverIds: arrayUnion(community.id)
      });

      await batch.commit();
      toast({
        title: "Joined Duniya Community",
        description: `Welcome to ${community.name}!`,
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
    <div className="flex-1 flex flex-col h-full bg-muted/10 overflow-hidden">
      <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl">
            <Globe className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Duniya</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Public Directory</p>
          </div>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Duniya..." 
            className="pl-9 bg-muted/40 border-none rounded-xl h-9 text-foreground" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium text-foreground">Scanning the Verse...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-bold text-destructive">Discovery Interrupted</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Check your connection or community visibility settings.
              </p>
            </div>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50">
            <Globe className="h-16 w-16 text-muted-foreground/30" />
            <div>
              <h3 className="text-xl font-bold text-foreground">No Active Communities</h3>
              <p className="text-sm max-w-xs text-muted-foreground">Try searching for something else, or make your own group public!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCommunities.map((community) => {
              const isMember = community.members?.includes(user?.uid);
              return (
                <Card key={community.id} className="group hover:shadow-xl transition-all border border-border bg-card overflow-hidden flex flex-col">
                  <div className="h-20 bg-gradient-to-r from-primary/20 to-accent/20 relative shrink-0">
                    <div className="absolute -bottom-6 left-4">
                      <Avatar className="h-12 w-12 border-4 border-card shadow-lg">
                        <AvatarImage src={community.icon || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">{community.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <CardHeader className="pt-8 pb-3 shrink-0">
                    <CardTitle className="text-md flex items-center justify-between text-foreground">
                      <span className="truncate">{community.name}</span>
                      <Badge variant="secondary" className="bg-muted text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        {community.members?.length || 0}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 min-h-[32px] text-muted-foreground">
                      {community.description || `Welcome to ${community.name}! Join our public community.`}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0 border-t bg-muted/10 mt-auto shrink-0 border-border">
                    <Button 
                      className="w-full mt-4 rounded-xl" 
                      variant={isMember ? "secondary" : "default"}
                      disabled={joiningId === community.id}
                      onClick={() => handleJoin(community)}
                    >
                      {joiningId === community.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : isMember ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {isMember ? "Already In" : "Join Community"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
