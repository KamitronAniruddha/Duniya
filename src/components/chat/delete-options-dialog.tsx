
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, User, Users, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  isSender: boolean;
  count?: number;
}

export function DeleteOptionsDialog({ 
  open, 
  onOpenChange, 
  onDeleteForMe, 
  onDeleteForEveryone, 
  isSender,
  count = 1 
}: DeleteOptionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-background animate-in zoom-in-95 duration-200">
        <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-destructive/10 to-transparent">
          <div className="h-12 w-12 bg-destructive/20 rounded-2xl flex items-center justify-center mb-4 text-destructive">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">Delete Message?</DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground">
            {count > 1 ? `How would you like to remove these ${count} messages?` : "Choose how you want to remove this message from the Verse."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-2 space-y-3">
          <button
            onClick={() => { onDeleteForMe(); onOpenChange(false); }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/40 hover:bg-muted transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm text-muted-foreground group-hover:text-foreground">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Delete for Me</span>
              <span className="text-[10px] text-muted-foreground font-medium">Hides this message from your view only.</span>
            </div>
          </button>

          {isSender && onDeleteForEveryone && (
            <button
              onClick={() => { onDeleteForEveryone(); onOpenChange(false); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-destructive/5 hover:bg-destructive/10 transition-all text-left group border border-destructive/10"
            >
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shadow-sm text-destructive">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-destructive">Delete for Everyone</span>
                <span className="text-[10px] text-destructive/60 font-medium">Removes content for all participants.</span>
              </div>
            </button>
          )}
        </div>

        <DialogFooter className="p-8 pt-4 bg-muted/20 border-t flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" className="w-full rounded-xl font-bold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
