
"use client";

import { useState, useEffect, useMemo } from "react";
import { useCollection, useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc, getDocs, arrayUnion, arrayRemove, limit } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Loader2, UserPlus, Check, AlertCircle, UserMinus, Shield, Search, X, EyeOff, Ghost, Send, Bell, Reply, Camera, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { UserProfilePopover } from "@/components/profile/user-profile-popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MembersPanelProps {
  serverId: string;
  onWhisper?: (userId: string, username: string) => void;
  onReply?: (userId: string, username: string) => void;
  onReplyProfile?: (userId: string, username: string, photoURL: string, bio?: string, totalCommunities?: number, commonCommunities?: number) => void;
}

export function MembersPanel({ serverId, onWhisper, onReply, onReplyProfile }: MembersPanelProps) {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const serverRef = useMemoFirebase(() => (serverId && currentUser ? doc(db, "communities", serverId) : null), [db, serverId, currentUser?.uid]);
  const { data: server } = useDoc(serverRef);

  const userDocRef = useMemoFirebase(() => (currentUser ? doc(db, "users", currentUser.uid) : null), [db, currentUser?.uid]);
  const { data: currentUserData } = useDoc(userDocRef);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !serverId || !currentUser) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", serverId));
  }, [db, serverId, currentUser?.uid]);

  const { data: members, isLoading: isMembersLoading } = useCollection(membersQuery);

  const isOwner = server?.ownerId === currentUser?.uid;
  const serverAdmins = server?.admins || [];
  const isAdmin = isOwner || (Array.isArray(serverAdmins) && serverAdmins.includes(currentUser?.uid || ""));

  const pendingInvitesQuery = useMemoFirebase(() => {
    if (!db || !serverId || !isAdmin) return null;
    return query(
      collection(db, "invitations"),
      where("communityId", "==", serverId),
      where("status", "in", ["pending", "declined"])
    );
  }, [db, serverId, isAdmin]);

  const { data: pendingInvites } = useCollection(pendingInvitesQuery);

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

  const segmentedMembers = useMemo(() => {
    if (!members) return { online: [], away: [], offline: [] };

    const STALE_THRESHOLD = 3 * 60 * 1000;

    return members.reduce((acc: any, m) => {
      const lastSeen = m.lastOnlineAt ? new Date(m.lastOnlineAt).getTime() : 0;
      const isFresh = (now - lastSeen) < STALE_THRESHOLD;
      const isPublic = m.showOnlineStatus !== false;

      if (!isFresh || !isPublic || m.onlineStatus === "offline") {
        acc.offline.push(m);
      } else if (m.onlineStatus === "idle") {
        acc.away.push(m);
      } else {
        acc.online.push(m);
      }
      return acc;
    }, { online: [], away: [], offline: [] });
  }, [members, now]);

  if (!server) return null;

  const handleInvite = async () => {
    if (selectedUsers.length === 0 || !db || !server) return;
    setIsInviting(true);

    try {
      for (const target of selectedUsers) {
        const inviteId = `${serverId}_${target.id}`;
        const inviteRef = doc(db, "invitations", inviteId);
        
        setDocumentNonBlocking(inviteRef, {
          id: inviteId,
          targetUserId: target.id,
          targetUsername: target.username || "User",
          targetUserPhoto: target.photoURL || null,
          senderId: currentUser?.uid,
          senderName: currentUserData?.username || currentUser?.displayName || "Admin",
          communityId: serverId,
          communityName: server.name,
          communityIcon: server.icon || null,
          status: "pending",
          createdAt: new Date().toISOString()
        }, { merge: true });
      }

      toast({ 
        title: "Invitations Sent", 
        description: `Requests sent to ${selectedUsers.length} user(s).` 
      });
      
      setSelectedUsers([]);
      setSearchQuery("");
      setIsInviteOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invite Failed", description: error.message });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemind = (invite: any) => {
    const inviteRef = doc(db, "invitations", invite.id);
    updateDocumentNonBlocking(inviteRef, {
      status: "pending",
      createdAt: new Date().toISOString()
    });
    toast({ title: "Reminder Sent", description: `@${invite.targetUsername} notified in the Verse.` });
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
      toast({ title: "Member Removed", description: `@${targetUsername} has been removed from the community.` });
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

  const triggerReply = (member: any) => {
    if (!onReplyProfile || !currentUserData) return;
    const targetServers = member.serverIds || [];
    const myServers = currentUserData.serverIds || [];
    const common = targetServers.filter((id: string) => myServers.includes(id)).length;
    onReplyProfile(member.id, member.username || member.displayName || "User", member.photoURL || "", member.bio, targetServers.length, common);
  };

  return (
    <aside className="w-64 bg-background border-l border-border flex flex-col h-full overflow-hidden shrink-0">
      <header className="h-14 px-4 border-b flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-foreground">Members</h3>
          {members && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-mono">{members.length}</span>}
        </div>
        {isAdmin && (
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
              <p className="text-[10px] font-medium uppercase text-foreground">Syncing Directory</p>
            </div>
          ) : (
            <>
              {isAdmin && pendingInvites && pendingInvites.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary/80 px-2 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_4px_rgba(var(--primary),0.6)]" />
                    Awaiting Action — {pendingInvites.length}
                  </h4>
                  <div className="space-y-0.5">
                    {pendingInvites.map((invite: any) => (
                      <div key={invite.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors group">
                        <Avatar className="h-8 w-8 border border-border shadow-sm opacity-60">
                          <AvatarImage src={invite.targetUserPhoto} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                            {String(invite.targetUsername || "U")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={cn(
                            "text-xs font-bold truncate leading-none",
                            invite.status === "declined" ? "text-destructive/70" : "text-muted-foreground"
                          )}>
                            @{invite.targetUsername}
                          </span>
                          <span className={cn(
                            "text-[8px] uppercase font-black tracking-tighter mt-0.5",
                            invite.status === "declined" ? "text-destructive/50" : "text-muted-foreground/60"
                          )}>
                            {invite.status === "declined" ? "Declined (Notify to Retry)" : "Waiting for User"}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleRemind(invite)}
                          title={invite.status === "declined" ? "Notify Again" : "Remind User"}
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {segmentedMembers.online.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-green-500/80 px-2 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                    On Screen — {segmentedMembers.online.length}
                  </h4>
                  <div className="space-y-0.5">
                    {segmentedMembers.online.map((member: any) => (
                      <MemberItem 
                        key={member.id} 
                        member={member} 
                        isOwner={member.id === server.ownerId}
                        isAdmin={serverAdmins.includes(member.id)}
                        canManage={isAdmin && member.id !== currentUser?.uid}
                        onRemove={() => handleRemoveMember(member.id, member.username)}
                        onToggleAdmin={() => handleToggleAdmin(member.id, serverAdmins.includes(member.id))}
                        onWhisper={onWhisper}
                        onReply={triggerReply}
                        now={now}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {segmentedMembers.away.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 px-2 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
                    Background — {segmentedMembers.away.length}
                  </h4>
                  <div className="space-y-0.5">
                    {segmentedMembers.away.map((member: any) => (
                      <MemberItem 
                        key={member.id} 
                        member={member} 
                        isOwner={member.id === server.ownerId}
                        isAdmin={serverAdmins.includes(member.id)}
                        canManage={isAdmin && member.id !== currentUser?.uid}
                        onRemove={() => handleRemoveMember(member.id, member.username)}
                        onToggleAdmin={() => handleToggleAdmin(member.id, serverAdmins.includes(member.id))}
                        onWhisper={onWhisper}
                        onReply={triggerReply}
                        now={now}
                      />
                    ))}
                  </div>
                </div>
              )}

              {segmentedMembers.offline.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Offline — {segmentedMembers.offline.length}</h4>
                  <div className="space-y-0.5 opacity-60 grayscale-[0.5]">
                    {segmentedMembers.offline.map((member: any) => (
                      <MemberItem 
                        key={member.id} 
                        member={member} 
                        isOwner={member.id === server.ownerId}
                        isAdmin={serverAdmins.includes(member.id)}
                        canManage={isAdmin && member.id !== currentUser?.uid}
                        onRemove={() => handleRemoveMember(member.id, member.username)}
                        onToggleAdmin={() => handleToggleAdmin(member.id, serverAdmins.includes(member.id))}
                        onWhisper={onWhisper}
                        onReply={triggerReply}
                        now={now}
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
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl flex flex-col h-fit max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Invite Members</DialogTitle>
            <DialogDescription className="font-medium">Selected users will receive a popup to join your community.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-4 py-4">
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedUsers.map(u => (
                    <Badge key={u.id} variant="secondary" className="pl-1 pr-1 py-1 flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback className="text-[6px]">{u.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] font-bold">@{u.username}</span>
                      <button onClick={() => toggleUserSelection(u)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"><X className="h-2 w-2" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Search Universe</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="search" className="pl-9 bg-muted/40 border-none rounded-xl" placeholder="Type a username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={isInviting} />
                </div>
              </div>
              <div className="space-y-2 min-h-[120px]">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground px-1">Results</h4>
                {isSearching ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" /></div> : (searchQuery.trim().length < 2 ? <div className="flex items-center justify-center py-8 opacity-30"><p className="text-xs text-foreground">Type @handle to search...</p></div> : (searchResults.length === 0 ? <div className="flex items-center justify-center py-8 opacity-30"><p className="text-xs text-foreground">No users found.</p></div> : <div className="space-y-1">{searchResults.map((u) => { const isSelected = selectedUsers.some(sel => sel.id === u.id); return ( <button key={u.id} type="button" onClick={() => toggleUserSelection(u)} className={cn("w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left", isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent")}> <Avatar className="h-6 w-6"><AvatarImage src={u.photoURL} /><AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{u.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar> <span className="text-xs font-bold flex-1 text-foreground">@{u.username}</span> {isSelected && <Check className="h-3 w-3 text-primary" />} </button> ); })}</div>))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 shrink-0">
            <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => { setIsInviteOpen(false); setSelectedUsers([]); }} disabled={isInviting}>Cancel</Button>
            <Button className="rounded-xl font-black shadow-lg shadow-primary/20" onClick={handleInvite} disabled={isInviting || selectedUsers.length === 0}>{isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Send Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}</Button>
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
  onWhisper,
  onReply,
  now
}: { 
  member: any; 
  isOwner: boolean; 
  isAdmin: boolean;
  canManage: boolean;
  onRemove: () => void;
  onToggleAdmin: () => void;
  onWhisper?: (userId: string, username: string) => void;
  onReply?: (member: any) => void;
  now: number;
}) {
  const { user: currentUser } = useUser();
  
  const lastSeen = member.lastOnlineAt ? new Date(member.lastOnlineAt).getTime() : 0;
  const isFresh = (now - lastSeen) < (3 * 60 * 1000);
  const isPublic = member.showOnlineStatus !== false;

  const isOnline = isFresh && isPublic && member.onlineStatus === "online";
  const isIdle = isFresh && isPublic && member.onlineStatus === "idle";
  
  const isHidden = !!member.isProfileHidden && member.id !== currentUser?.uid;
  const isBlurred = !!member.isProfileBlurred && member.id !== currentUser?.uid && !member.authorizedViewers?.includes(currentUser?.uid || "");
  
  const cleanUsername = member.username || member.displayName || "User";

  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors group cursor-default relative">
      <UserProfilePopover 
        userId={member.id} 
        onWhisper={onWhisper} 
        onReply={(id, name, photo, bio, total, common) => onReply?.(member)}
        side="left"
      >
        <button className="relative transition-transform hover:scale-110">
          <Avatar className={cn(
            "h-8 w-8 border border-border shadow-sm aspect-square",
            isBlurred && "blur-sm"
          )}>
            {isHidden ? (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                <Ghost className="h-4 w-4" />
              </div>
            ) : (
              <>
                <AvatarImage src={member.photoURL || undefined} className="aspect-square object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                  {String(cleanUsername)[0]?.toUpperCase()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          {isOnline ? (
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
          ) : isIdle ? (
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
          ) : null}
        </button>
      </UserProfilePopover>
      
      <div className="flex flex-col min-w-0 flex-1">
        <UserProfilePopover 
          userId={member.id} 
          onWhisper={onWhisper} 
          onReply={(id, name, photo, bio, total, common) => onReply?.(member)}
          side="left"
        >
          <button className="flex items-center gap-1 min-w-0 w-full text-left">
            <span className={cn(
              "text-xs font-bold truncate leading-none hover:text-primary transition-colors",
              (isOnline || isIdle) ? "text-foreground" : "text-muted-foreground"
            )}>
              @{cleanUsername}
            </span>
            {isOwner ? (
              <ShieldCheck className="h-3 w-3 text-orange-500 shrink-0" title="Server Owner" />
            ) : isAdmin ? (
              <Shield className="h-3 w-3 text-blue-500 shrink-0" title="Server Admin" />
            ) : null}
          </button>
        </UserProfilePopover>
        {!isHidden && member.bio && (
          <span className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
            {member.bio}
          </span>
        )}
        {isHidden && (
          <span className="text-[10px] text-muted-foreground truncate leading-none mt-0.5 italic flex items-center gap-1">
            <EyeOff className="h-2 w-2" /> Encrypted
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onReply && member.id !== currentUser?.uid && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10" onClick={() => onReply(member)}>
            <Camera className="h-3.5 w-3.5" />
          </Button>
        )}
        {onWhisper && member.id !== currentUser?.uid && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10" onClick={() => onWhisper(member.id, cleanUsername)}>
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
              <DropdownMenuItem className="text-destructive font-medium" onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove @${cleanUsername} from community?`)) onRemove();
              }}>
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
