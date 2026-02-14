"use client";

import { useState } from "react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CalendarDays, User as UserIcon, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";

interface UserProfilePopoverProps {
  userId: string;
  children: React.ReactNode;
}

export function UserProfilePopover({ userId, children }: UserProfilePopoverProps) {
  const db = useFirestore();
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const userRef = useMemoFirebase(() => doc(db, "users", userId), [db, userId]);
  const { data: userData, isLoading } = useDoc(userRef);

  const joinDate = userData?.createdAt?.toDate
    ? userData.createdAt.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : "";

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 overflow-hidden" side="right" align="start" sideOffset={10}>
          <div className="h-16 bg-primary w-full" />
          <div className="px-4 pb-4">
            <div className="relative -mt-8 mb-3">
              <button 
                onClick={() => setIsZoomOpen(true)}
                className="group relative h-20 w-20 rounded-full border-4 border-white shadow-md overflow-hidden transition-transform hover:scale-105"
              >
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage src={userData?.photoURL || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                    {userData?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="h-5 w-5 text-white" />
                </div>
              </button>
              <div className={cn(
                "absolute bottom-1 left-16 h-5 w-5 rounded-full border-4 border-white",
                userData?.onlineStatus === "online" ? "bg-green-500" : "bg-gray-300"
              )} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">@{userData?.username || "..."}</h3>
                {userData?.onlineStatus === "online" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] h-5">Online</Badge>
                )}
              </div>
              {userData?.bio && (
                <p className="text-sm text-foreground/80 leading-snug">{userData.bio}</p>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">About</h4>
                <p className="text-xs">{userData?.bio || "No bio set."}</p>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full flex items-center justify-center group">
            {userData?.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt={userData.username} 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200"
              />
            ) : (
              <div className="w-64 h-64 bg-primary rounded-full flex items-center justify-center text-white text-8xl font-bold shadow-2xl">
                {userData?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <button 
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-colors md:hidden"
            >
              <UserIcon className="h-6 w-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}