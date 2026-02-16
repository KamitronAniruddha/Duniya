
"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, arrayUnion, writeBatch, limit } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Users, Globe, ArrowRight, Heart, CheckCircle2, ShieldCheck } from "lucide-react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CreatorFooter } from "@/components/creator-footer";

export default function InviteLandingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  const communityId = Array.isArray(id) ? id[0] : id;

  const communityRef = useMemoFirebase(() => (communityId ? doc(db, "communities", communityId) : null), [db, communityId]);
  const { data: community, isLoading: isCommunityLoading } = useDoc(communityRef);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !communityId) return null;
    return query(collection(db, "users"), where("serverIds", "array-contains", communityId), limit(12));
  }, [db, communityId]);

  const { data: members, isLoading: isMembersLoading } = useCollection(membersQuery);

  const isAlreadyMember = useMemo(() => {
    if (!user || !community) return false;
    return community.members?.includes(user.uid);
  }, [user, community]);

  const handleJoin = async () => {
    if (!user || !db || !communityId || !community) return;
    setIsJoining(true);

    try {
      const batch = writeBatch(db);
      
      // Update community members array
      batch.update(doc(db, "communities", communityId), {
        members: arrayUnion(user.uid)
      });

      // Update user serverIds array
      batch.update(doc(db, "users", user.uid), {
        serverIds: arrayUnion(communityId)
      });

      // Create member sub-collection document for role tracking
      batch.set(doc(db, "communities", communityId, "members", user.uid), {
        id: user.uid,
        communityId: communityId,
        userId: user.uid,
        role: "member",
        joinedAt: new Date().toISOString()
      });

      await batch.commit();
      
      toast({
        title: "Welcome to the Community!",
        description: `You are now a member of ${community.name}.`,
      });
      
      router.push("/");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Join Error",
        description: e.message || "Could not join community.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (isUserLoading || isCommunityLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Invitation</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!community) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="p-8 bg-destructive/10 rounded-[3rem] mb-6">
          <Heart className="h-16 w-16 text-destructive rotate-45" />
        </div>
        <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Invitation Void</h2>
        <p className="text-muted-foreground max-w-sm mb-8 font-medium">This community does not exist or the link has expired in the Verse.</p>
        <Button variant="outline" className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest" onClick={() => router.push("/")}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <Card className="rounded-[2.5rem] border-none shadow-[0_32px_64px_rgba(0,0,0,0.1)] bg-card/80 backdrop-blur-xl overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-primary to-accent relative">
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-card shadow-2xl transition-transform group-hover:scale-105">
                  <AvatarImage src={community.icon} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white text-3xl font-black">
                    {community.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-card flex items-center justify-center shadow-lg">
                  <Globe className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>

          <CardHeader className="pt-16 pb-4 text-center">
            <div className="space-y-1 mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Community Invitation</span>
              <CardTitle className="text-4xl font-black tracking-tighter uppercase">{community.name}</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium leading-relaxed px-4">
              {community.description || "A legendary community awaiting your arrival in the Duniya Verse."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 px-8">
            <div className="flex items-center justify-center gap-12">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="h-4 w-4" />
                  <span className="text-2xl font-black">{community.members?.length || 0}</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Participants</span>
              </div>
              <div className="w-[1px] h-8 bg-border/50" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verse Protected</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Identity Verified</span>
              </div>
            </div>

            {members && members.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-center text-muted-foreground/60">Recent Activity</h4>
                <div className="flex justify-center -space-x-3 overflow-hidden">
                  {members.map((member) => (
                    <Avatar key={member.id} className="h-10 w-10 border-4 border-card ring-1 ring-border/50 hover:scale-110 transition-transform cursor-pointer">
                      <AvatarImage src={member.photoURL} className="object-cover" />
                      <AvatarFallback className="bg-muted text-[10px] font-bold">
                        {member.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="px-8 pb-10 pt-4">
            <AnimatePresence mode="wait">
              {isAlreadyMember ? (
                <motion.div 
                  key="already-member"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col gap-4"
                >
                  <div className="flex items-center justify-center gap-2 py-3 bg-primary/5 rounded-2xl border border-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">You are already a member</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full h-16 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 gap-3 group"
                    onClick={() => router.push("/")}
                  >
                    Open Community <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              ) : (
                <Button 
                  size="lg" 
                  className={cn(
                    "w-full h-16 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 gap-3 group transition-all",
                    isJoining && "opacity-80 scale-[0.98]"
                  )}
                  disabled={isJoining}
                  onClick={handleJoin}
                >
                  {isJoining ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>Accept Invitation <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>
                  )}
                </Button>
              )}
            </AnimatePresence>
          </CardFooter>
        </Card>

        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 backdrop-blur-md rounded-full border border-border shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Verified Invitation by Duniya</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
          </div>
          <CreatorFooter />
        </div>
      </motion.div>
    </div>
  );
}
