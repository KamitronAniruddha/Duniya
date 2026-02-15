"use client";

import { useState, useEffect } from "react";
import { useCollection, useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc, getDocs, arrayUnion, arrayRemove, limit, deleteDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Loader2, UserPlus, Check, AlertCircle, UserMinus, Shield, Search, X, EyeOff, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MembersPanelProps {
  serverId: string;
  onWhisper?: (userId: string, username: string) => void;
}

export function MembersPanel({ serverId, onWhisper }: MembersPanelProps) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const serverRef = useMemoFirebase(() => (serverId && currentUser ? doc(db, "communities", serverId) : null), [db, serverId, currentUser?.uid]);
  const { data: server } = useDoc(serverRef);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId || !currentUser) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId, currentUser?.uid]);

  const { data: members, isLoading: isMembersLoading } = useCollection(membersQuery);

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
          limit(10)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id }))
          .filter(u => {
            const isNotAlreadyInServer = !u.serverIds?.includes(serverId);
            const allowsInvites = u.allowGroupInvites !== false;
            return isNotAlreadyInServer && allowsInvites;
          });
        
        setSearchResults(users);
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, db, serverId, currentUser]);

  if (!server) return null;

  const isOwner = server.ownerId === currentUser?.uid;
  const serverAdmins = server.admins || [];
  
  const onlineMembers = members?.filter(m => m.onlineStatus === "online" && m.showOnlineStatus !== false) || [];
  const offlineMembers = members?.filter(m => m.onlineStatus !== "online" || m.showOnlineStatus === false) || [];

  const handleInvite = async () => {
    if (selectedUsers.length === 0 || !db || !serverRef) return;
    setIsInviting(true);

    try {
      const userIdsToAdd = selectedUsers.map(u => u.id);
      updateDocumentNonBlocking(serverRef, { members: arrayUnion(...userIdsToAdd) });
      selectedUsers.forEach(u => {
        const userRef = doc(db, "users", u.id);
        updateDocumentNonBlocking(userRef, { serverIds: arrayUnion(serverId) });
      });
      toast({ title: "Invites Sent", description: `Successfully added ${selectedUsers.length} user(s) to the community.` });
      setSelectedUsers([]);
      setSearchQuery("");
      setIsInviteOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invite Failed", description: error.message });
    } finally {
      setIsInviting(false);
    }
  };

  const toggleUserSelection = (user: any) => {
    setSelectedUsers(prev => {
      const isAlreadySelected = prev.find(u => u.id === user.id);
      if (isAlreadySelected) return prev.filter(u => u.id !== user.id);
      else return [...prev, user];
    });
  };

  const handleRemoveMember = (targetUserId: string, targetUsername: string) => {
    if (!db || !server || !serverRef) return;
    try {
      updateDocumentNonBlocking(serverRef, { members: arrayRemove(targetUserId), admins: arrayRemove(targetUserId) });
      const memberDocRef = doc(db, "communities", serverId, "members", targetUserId);
      deleteDocumentNonBlocking(memberDocRef);
      toast({ title: "Member Removed", description: `${targetUsername} has been removed from the community.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Removal Failed", description: error.message });
    }
  };

  const handleToggleAdmin = (targetUserId: string, isAdmin: boolean) => {
    if (!db || !server || !serverRef) return;
    try {
      updateDocumentNonBlocking(serverRef, { admins: isAdmin ? arrayRemove(targetUserId) : arrayUnion(targetUserId) });
      toast({ title: isAdmin ? "Admin Removed" : "Admin Added", description: `User role has been updated.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Role Update Failed", description: error.message });
    }
  };

  return (
    <aside className="w-64 bg-background border-l border-border flex flex-col h-full overflow-hidden shrink-0">
      <header className="h-14 px-4 border-b flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-foreground">Members</h3>
          {members && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-mono">{members.length}</span>}
        </div>
        {(isOwner || serverAdmins.includes(currentUser?.uid)) && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </header>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {isMembersLoading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              <p className="text-[10px] font-medium uppercase text-foreground">Loading Members</p>
            </div>
          ) : members?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 opacity-50">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No members found</p>
            </div>
          ) : (
            <>
              {onlineMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Online — {onlineMembers.length}</h4>
                  <div className="space-y-0.5">
                    {onlineMembers.map((member) => (
                      <MemberItem 
                        key={member.id} 
                        member={member} 
                        isOwner={member.id === server.ownerId}
                        isAdmin={serverAdmins.includes(member.id)}
                        canManage={(isOwner || serverAdmins.includes(currentUser?.uid)) && member.id !== currentUser?.uid}
                        onRemove={() => handleRemoveMember(member.id, member.username)}
                        onToggleAdmin={() => handleToggleAdmin(member.id, serverAdmins.includes(member.id))}
                        onWhisper={onWhisper}
                      />
                    ))}
                  </div>
                </div>
              )}
              {offlineMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Offline — {offlineMembers.length}</h4>
                  <div className="space-y-0.5">
                    {offlineMembers.map((member) => (
                      <MemberItem 
                        key={member.id} 
                        member={member} 
                        isOwner={member.id === server.ownerId}
                        isAdmin={serverAdmins.includes(member.id)}
                        canManage={(isOwner || serverAdmins.includes(currentUser?.uid)) && member.id !== currentUser?.uid}
                        onRemove={() => handleRemoveMember(member.id, member.username)}
                        onToggleAdmin={() => handleToggleAdmin(member.id, serverAdmins.includes(member.id))}
                        onWhisper={onWhisper}
                      />
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
            <DialogTitle>Invite Members</DialogTitle>
            <DialogDescription>Search for users by username. Only users who allow group invites will appear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="pl-1 pr-1 py-1 flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                    <Avatar className="h-4 w-4"><AvatarImage src={u.photoURL} /><AvatarFallback className="text-[6px]">{u.username?.[0]}</AvatarFallback></Avatar>
                    <span className="text-[10px] font-bold">{u.username}</span>
                    <button onClick={() => toggleUserSelection(u)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"><X className="h-2 w-2" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="search" className="pl-9" placeholder="Type a username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={isInviting} />
              </div>
            </div>
            <div className="space-y-2 min-h-[120px]">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground px-1">Search Results</h4>
              {isSearching ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" /></div> : (searchQuery.trim().length < 2 ? <div className="flex items-center justify-center py-8 opacity-30"><p className="text-xs text-foreground">Type at least 2 characters...</p></div> : (searchResults.length === 0 ? <div className="flex items-center justify-center py-8 opacity-30"><p className="text-xs text-foreground">No users found or available.</p></div> : <div className="space-y-1">{searchResults.map((u) => { const isSelected = selectedUsers.some(sel => sel.id === u.id); return ( <button key={u.id} type="button" onClick={() => toggleUserSelection(u)} className={cn("w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left", isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent")}> <Avatar className="h-6 w-6"><AvatarImage src={u.photoURL} /><AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{u.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar> <span className="text-xs font-bold flex-1 text-foreground">{u.username}</span> {isSelected && <Check className="h-3 w-3 text-primary" />} </button> ); })}</div>))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setIsInviteOpen(false); setSelectedUsers([]); }} disabled={isInviting}>Cancel</Button>
            <Button onClick={handleInvite} disabled={isInviting || selectedUsers.length === 0}>{isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function MemberItem({ 
  member, 
  isOwner, 
  isAdmin,
  canManage, 
  onRemove,
  onToggleAdmin,
  onWhisper
}: { 
  member: any; 
  isOwner: boolean; 
  isAdmin: boolean;
  canManage: boolean;
  onRemove: () => void;
  onToggleAdmin: () => void;
  onWhisper?: (userId: string, username: string) => void;
}) {
  const isOnline = member.onlineStatus === "online" && member.showOnlineStatus !== false;
  const { user: currentUser } = useUser();

  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors group cursor-default relative">
      <UserProfilePopover userId={member.id} onWhisper={onWhisper}>
        <button className="relative transition-transform hover:scale-110">
          <Avatar className="h-8 w-8 border border-border shadow-sm aspect-square">
            <AvatarImage src={member.photoURL || undefined} className="aspect-square object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
              {member.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
          )}
        </button>
      </UserProfilePopover>
      
      <div className="flex flex-col min-w-0 flex-1">
        <UserProfilePopover userId={member.id} onWhisper={onWhisper}>
          <button className="flex items-center gap-1 min-w-0 w-full text-left">
            <span className={cn(
              "text-xs font-bold truncate leading-none hover:text-primary transition-colors",
              isOnline ? "text-foreground" : "text-muted-foreground"
            )}>
              {member.username}
            </span>
            {isOwner ? (
              <ShieldCheck className="h-3 w-3 text-orange-500 shrink-0" title="Server Owner" />
            ) : isAdmin ? (
              <Shield className="h-3 w-3 text-blue-500 shrink-0" title="Server Admin" />
            ) : null}
          </button>
        </UserProfilePopover>
        {member.bio && (
          <span className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
            {member.bio}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onWhisper && member.id !== currentUser?.uid && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10" onClick={() => onWhisper(member.id, member.username)}>
            <Ghost className="h-3.5 w-3.5" />
          </Button>
        )}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                <Shield className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggleAdmin}>
                {isAdmin ? "Demote to User" : "Promote to Admin"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive font-medium" asChild>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 text-left">
                      <UserMinus className="h-4 w-4" />
                      Remove from Community
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <strong>{member.username}</strong> from this community?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemove} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Remove Member
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}