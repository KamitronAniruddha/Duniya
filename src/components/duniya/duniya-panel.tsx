"use client";

import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, Timestamp } from "firebase/firestore";
import { Globe, Search, Users, Loader2, Plus, Check, AlertCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export function DuniyaPanel({ onJoinSuccess }: { onJoinSuccess: (serverId: string) => void }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const publicServersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "servers"),
      where("isBroadcasted", "==", true)
    );
  }, [db]);

  const { data: publicServers, isLoading, error } = useCollection(publicServersQuery);

  // Filter for search and expiry on the client to avoid complex index requirements
  const filteredServers = useMemo(() => {
    if (!publicServers) return [];
    
    const now = Date.now();
    
    return publicServers.filter(server => {
      // 1. Basic text search
      const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Check for expiry
      if (server.broadcastExpiry) {
        const expiryDate = server.broadcastExpiry.toDate ? server.broadcastExpiry.toDate() : new Date(server.broadcastExpiry);
        if (expiryDate.getTime() < now) return false;
      }

      return true;
    });
  }, [publicServers, searchQuery]);

  const handleJoin = async (server: any) => {
    if (!user || !db) return;
    setJoiningId(server.id);

    try {
      if (server.members?.includes(user.uid)) {
        onJoinSuccess(server.id);
        return;
      }

      const serverRef = doc(db, "servers", server.id);
      const userRef = doc(db, "users", user.uid);

      setDocumentNonBlocking(serverRef, {
        members: arrayUnion(user.uid)
      }, { merge: true });

      setDocumentNonBlocking(userRef, {
        serverIds: arrayUnion(server.id)
      }, { merge: true });

      toast({
        title: "Joined Duniya Server",
        description: `Welcome to ${server.name}!`,
      });
      
      onJoinSuccess(server.id);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Join Error",
        description: e.message || "Could not join server.",
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
                We encountered an error while scanning Duniya. Please try refreshing or checking your connection.
              </p>
            </div>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50">
            <Globe className="h-16 w-16 text-muted-foreground/30" />
            <div>
              <h3 className="text-xl font-bold text-foreground">No Active Broadcasts</h3>
              <p className="text-sm max-w-xs text-muted-foreground">Try searching for something else, or broadcast your own group to Duniya!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServers.map((server) => {
              const isMember = server.members?.includes(user?.uid);
              const expiryDate = server.broadcastExpiry?.toDate ? server.broadcastExpiry.toDate() : (server.broadcastExpiry ? new Date(server.broadcastExpiry) : null);
              
              return (
                <Card key={server.id} className="group hover:shadow-xl transition-all border border-border bg-card overflow-hidden flex flex-col">
                  <div className="h-20 bg-gradient-to-r from-primary/20 to-accent/20 relative shrink-0">
                    <div className="absolute -bottom-6 left-4">
                      <Avatar className="h-12 w-12 border-4 border-card shadow-lg">
                        <AvatarImage src={server.icon || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">{server.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    {expiryDate && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                        <Clock className="h-2.5 w-2.5" />
                        Ends {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <CardHeader className="pt-8 pb-3 shrink-0">
                    <CardTitle className="text-md flex items-center justify-between text-foreground">
                      <span className="truncate">{server.name}</span>
                      <Badge variant="secondary" className="bg-muted text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        {server.members?.length || 0}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 min-h-[32px] text-muted-foreground">
                      {server.description || `Welcome to ${server.name}! Join our public community.`}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0 border-t bg-muted/10 mt-auto shrink-0 border-border">
                    <Button 
                      className="w-full mt-4 rounded-xl" 
                      variant={isMember ? "secondary" : "default"}
                      disabled={joiningId === server.id}
                      onClick={() => handleJoin(server)}
                    >
                      {joiningId === server.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : isMember ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {isMember ? "Already In" : "Join Server"}
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