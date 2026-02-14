
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc, getDocs, arrayUnion } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, User as UserIcon, Loader2, UserPlus, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";

interface MembersPanelProps {
  serverId: string;
}

export function MembersPanel({ serverId }: MembersPanelProps) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const serverRef = useMemoFirebase(() => doc(db, "servers", serverId), [db, serverId]);
  const { data: server } = useDoc(serverRef);

  // Query users that belong to this server
  // We query by the serverIds array which is updated on the user document
  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId]);

  const { data: members, isLoading } = useCollection(membersQuery);

  if (!server) return null;

  const isOwner = server.ownerId === currentUser?.uid;
  const onlineMembers = members?.filter(m => m.onlineStatus === "online") || [];
  const offlineMembers = members?.filter(m => m.onlineStatus !== "online") || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !db) return;
    setIsInviting(true);

    try {
      // 1. Find the user by username
      const q = query(
        collection(db, "users"), 
        where("username", "==", inviteUsername.trim().toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found. Check the username and try again.");
      }

      const invitedUserDoc = querySnapshot.docs[0];
      const invitedUserId = invitedUserDoc.id;

      if (server.members?.includes(invitedUserId)) {
        throw new Error("User is already a member of this server.");
      }

      // 2. Update Server document
      updateDocumentNonBlocking(serverRef, {
        members: arrayUnion(invitedUserId)
      });

      // 3. Update the Invited User document
      const invitedUserRef = doc(db, "users", invitedUserId);
      updateDocumentNonBlocking(invitedUserRef, {
        serverIds: arrayUnion(serverId)
      });

      toast({ 
        title: "User Invited", 
        description: `${inviteUsername} has been added to the server!` 
      });
      setInviteUsername("");
      setIsInviteOpen(false);
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Invite Failed", 
        description: error.message 
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <aside className="w-64 bg-gray-50 border-l border-border flex flex-col h-full overflow-hidden shrink-0">
      <header className="h-14 px-4 border-b flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-foreground">Members</h3>
          {members && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-mono">
              {members.length}
            </span>
          )}
        </div>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        )}
      </header>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              <p className="text-[10px] font-medium uppercase">Loading Members</p>
            </div>
          ) : members?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 opacity-50">
              <AlertCircle className="h-8 w-8" />
              <p className="text-xs">No members found</p>
              {isOwner && (
                <Button variant="link" size="sm" onClick={() => setIsInviteOpen(true)}>
                  Invite your first member
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Online Section */}
              {onlineMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                    Online — {onlineMembers.length}
                  </h4>
                  <div className="space-y-0.5">
                    {onlineMembers.map((member) => (
                      <MemberItem key={member.id} member={member} isOwner={member.id === server.ownerId} />
                    ))}
                  </div>
                </div>
              )}

              {/* Offline Section */}
              {offlineMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                    Offline — {offlineMembers.length}
                  </h4>
                  <div className="space-y-0.5">
                    {offlineMembers.map((member) => (
                      <MemberItem key={member.id} member={member} isOwner={member.id === server.ownerId} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite to Server</DialogTitle>
            <DialogDescription>
              Enter the username of the person you want to add to this server.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteUsername">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="inviteUsername" 
                  className="pl-9" 
                  placeholder="johndoe" 
                  value={inviteUsername} 
                  onChange={(e) => setInviteUsername(e.target.value)} 
                  disabled={isInviting}
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)} disabled={isInviting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting || !inviteUsername.trim()}>
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function MemberItem({ member, isOwner }: { member: any; isOwner: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors group cursor-default">
      <div className="relative">
        <Avatar className="h-8 w-8 border border-white shadow-sm">
          <AvatarImage src={member.photoURL} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
            {member.username?.[0]?.toUpperCase() || <UserIcon className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-gray-50",
          member.onlineStatus === "online" ? "bg-green-500" : "bg-gray-300"
        )} />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn(
            "text-xs font-bold truncate leading-none",
            member.onlineStatus === "online" ? "text-foreground" : "text-muted-foreground"
          )}>
            {member.username}
          </span>
          {isOwner && (
            <ShieldCheck className="h-3 w-3 text-orange-500 shrink-0" title="Server Owner" />
          )}
        </div>
        {member.bio && (
          <span className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
            {member.bio}
          </span>
        )}
      </div>
    </div>
  );
}
