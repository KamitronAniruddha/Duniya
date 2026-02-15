
"use client";

import { useState, useEffect } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, getDocs, limit, setDoc, orderBy } from "firebase/firestore";
import { Search, Plus, MessageSquare, Loader2, UserPlus, X, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DMSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function DMSidebar({ activeConversationId, onSelectConversation }: DMSidebarProps) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  const convsQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null;
    // CRITICAL FIX: Removed orderBy("updatedAt") to avoid index requirement which often triggers permission-style errors when missing.
    return query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", currentUser.uid)
    );
  }, [db, currentUser?.uid]);

  const { data: conversations, isLoading: isConvsLoading } = useCollection(convsQuery);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!currentUser || !db) return;
      const cleanQuery = searchQuery.trim().toLowerCase();
      if (cleanQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const q = query(
          collection(db, "users"),
          where("username", ">=", cleanQuery),
          where("username", "<=", cleanQuery + "\uf8ff"),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id }))
          .filter(u => u.id !== currentUser.uid);
        setSearchResults(users);
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, db, currentUser]);

  const startConversation = async (otherUser: any) => {
    if (!currentUser || !db) return;
    setIsCreating(true);

    try {
      const convId = [currentUser.uid, otherUser.id].sort().join("_");
      const convRef = doc(db, "conversations", convId);
      
      await setDoc(convRef, {
        id: convId,
        participantIds: [currentUser.uid, otherUser.id],
        updatedAt: new Date().toISOString(),
        lastMessage: "New Conversation Started",
        createdAt: new Date().toISOString()
      }, { merge: true });

      onSelectConversation(convId);
      setIsNewChatOpen(false);
      setSearchQuery("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0 z-20 shadow-inner">
      <header className="h-16 px-4 border-b flex items-center justify-between shrink-0">
        <h2 className="font-black text-sm text-foreground tracking-tight uppercase">Private Chats</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setIsNewChatOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {isConvsLoading ? (
          <div className="flex justify-center py-10 opacity-20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : conversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-30">
            <MessageSquare className="h-10 w-10 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">No Active Conversations</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-3">
            {conversations?.map((conv) => {
              const otherId = conv.participantIds.find((id: string) => id !== currentUser?.uid);
              return (
                <ConversationItem 
                  key={conv.id} 
                  conversation={conv} 
                  otherUserId={otherId}
                  isActive={activeConversationId === conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  now={now}
                />
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-b from-primary/10 to-transparent">
            <DialogTitle className="text-xl font-black">New Chat</DialogTitle>
            <DialogDescription>Start a private conversation with anyone in Duniya.</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search username..." 
                className="pl-9 bg-muted/40 border-none rounded-xl" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[250px] pr-2">
              <div className="space-y-1">
                {isSearching ? (
                  <div className="flex justify-center py-10 opacity-20"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : searchResults.length === 0 ? (
                  <div className="py-10 text-center opacity-30 text-xs italic">
                    {searchQuery.length < 2 ? "Type @handle..." : "No users found"}
                  </div>
                ) : (
                  searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => startConversation(u)}
                      disabled={isCreating}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all text-left group"
                    >
                      <Avatar className="h-10 w-10 border shadow-sm group-hover:scale-105 transition-transform">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback className="bg-primary text-white font-black">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">@{u.username}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{u.bio || "Available in the Verse"}</span>
                      </div>
                      <UserPlus className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function ConversationItem({ conversation, otherUserId, isActive, onClick, now }: any) {
  const db = useFirestore();
  const otherUserRef = useMemoFirebase(() => doc(db, "users", otherUserId), [db, otherUserId]);
  const { data: otherUser } = useDoc(otherUserRef);

  const lastSeen = otherUser?.lastOnlineAt ? new Date(otherUser.lastOnlineAt).getTime() : 0;
  const isFresh = (now - lastSeen) < (3 * 60 * 1000);
  const isPublic = otherUser?.showOnlineStatus !== false;
  const isOnline = isFresh && isPublic && otherUser?.onlineStatus === "online";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group",
        isActive ? "bg-primary text-white shadow-lg" : "hover:bg-muted/60 text-muted-foreground"
      )}
    >
      {isActive && <div className="absolute left-[-8px] w-1 h-8 bg-white rounded-r-full animate-in slide-in-from-left duration-300" />}
      <div className="relative shrink-0">
        <Avatar className={cn("h-10 w-10 border-2 transition-transform group-hover:scale-105", isActive ? "border-white/20" : "border-transparent")}>
          <AvatarImage src={otherUser?.photoURL} />
          <AvatarFallback className={cn("font-black", isActive ? "bg-white/20 text-white" : "bg-primary text-white")}>
            {otherUser?.username?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500 shadow-sm" />
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1 items-start">
        <div className="flex items-center justify-between w-full">
          <span className={cn("text-xs font-black truncate tracking-tight", isActive ? "text-white" : "text-foreground")}>
            @{otherUser?.username || "..."}
          </span>
          <span className={cn("text-[8px] font-bold opacity-60", isActive ? "text-white" : "text-muted-foreground")}>
            {conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
          </span>
        </div>
        <p className={cn("text-[10px] truncate w-full font-medium italic mt-0.5", isActive ? "text-white/70" : "text-muted-foreground")}>
          {conversation.lastMessage}
        </p>
      </div>
    </button>
  );
}
