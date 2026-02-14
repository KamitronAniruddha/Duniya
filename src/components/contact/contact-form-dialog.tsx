
"use client";

import { useState } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, Send } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export function ContactFormDialog({ trigger }: { trigger?: React.ReactNode }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setIsLoading(true);

    const submissionRef = doc(collection(db, "contact_form_submissions"));
    const data = {
      id: submissionRef.id,
      submitterId: user?.uid || null,
      senderName: user?.displayName || "Anonymous User",
      senderEmail: user?.email || "anonymous@duniya.app",
      subject: subject.trim(),
      message: message.trim(),
      submittedAt: new Date().toISOString(),
      status: "New"
    };

    try {
      setDocumentNonBlocking(submissionRef, data, { merge: true });
      toast({ title: "Message Sent", description: "The admin team will review your message." });
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="h-4 w-4" /> Contact Support
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>Send a message to the Duniya administration team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              placeholder="How can we help?" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea 
              id="message" 
              placeholder="Describe your issue or feedback..." 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              className="min-h-[150px]"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
