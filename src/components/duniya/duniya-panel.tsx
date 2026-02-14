
"use client";

import { useState, useEffect } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, arrayUnion, orderBy } from "firebase/firestore";
import { Globe, Search, Users, Loader2, Plus, Check } from "lucide-react";
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
      where("isBroadcasted", "==", true),
      orderBy("createdAt", "desc")
    );
  }, [db]);

  const { data: publicServers, isLoading } = useCollection(publicServersQuery);

  const filteredServers = publicServers?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 overflow-hidden">
      <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl">
            <Globe className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Duniya</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Public Directory</p>
          </div>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Duniya..." 
            className="pl-9 bg-gray-50 border-none rounded-xl h-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">Scanning the Verse...</p>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50">
            <Globe className="h-16 w-16 text-muted-foreground/30" />
            <div>
              <h3 className="text-xl font-bold">No Public Groups Found</h3>
              <p className="text-sm max-w-xs">Try searching for something else, or broadcast your own group to Duniya!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServers.map((server) => {
              const isMember = server.members?.includes(user?.uid);
              return (
                <Card key={server.id} className="group hover:shadow-xl transition-all border-none bg-white overflow-hidden ring-1 ring-border">
                  <div className="h-20 bg-gradient-to-r from-primary/20 to-accent/20 relative">
                    <div className="absolute -bottom-6 left-4">
                      <Avatar className="h-12 w-12 border-4 border-white shadow-lg">
                        <AvatarImage src={server.icon} />
                        <AvatarFallback className="bg-primary text-white font-bold">{server.name?.[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <CardHeader className="pt-8 pb-3">
                    <CardTitle className="text-md flex items-center justify-between">
                      <span className="truncate">{server.name}</span>
                      <Badge variant="secondary" className="bg-gray-100 text-[10px]">
                        <Users className="h-3 w-3 mr-1" />
                        {server.members?.length || 0}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                      {server.description || `Welcome to ${server.name}! Join our public community.`}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0 border-t bg-gray-50/50 mt-auto">
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
