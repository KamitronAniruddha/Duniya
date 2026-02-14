
"use client";

import { useState } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Users, Mail, Shield, ShieldAlert, Loader2, CheckCircle, Clock, Search, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "users"), orderBy("createdAt", "desc"));
  }, [db, user?.uid]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "contact_form_submissions"), orderBy("submittedAt", "desc"));
  }, [db, user?.uid]);

  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);
  const { data: submissions, isLoading: submissionsLoading } = useCollection(submissionsQuery);

  const filteredUsers = users?.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleResolve = async (id: string) => {
    try {
      const docRef = doc(db, "contact_form_submissions", id);
      await updateDoc(docRef, {
        status: "Resolved",
        resolvedAt: new Date().toISOString()
      });
      toast({ title: "Submission Resolved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/5 overflow-hidden">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Admin Dashboard</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Management Suite</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-background border">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Contact Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.displayName}</span>
                        {u.isAdmin && <Shield className="h-3 w-3 text-primary" />}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.isBlocked ? "destructive" : "secondary"}>
                          {u.isBlocked ? "Blocked" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            {submissionsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : submissions?.length === 0 ? (
              <Card className="py-20 flex flex-col items-center opacity-50">
                <Mail className="h-12 w-12 mb-4" />
                <p>No support requests found.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions?.map((sub) => (
                  <Card key={sub.id} className={sub.status === "Resolved" ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={sub.status === "Resolved" ? "secondary" : "default"}>
                          {sub.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-2">{sub.subject}</CardTitle>
                      <CardDescription className="text-xs">From: {sub.senderName} ({sub.senderEmail})</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm bg-muted p-3 rounded-lg border">{sub.message}</p>
                      {sub.status !== "Resolved" && (
                        <Button className="w-full gap-2" size="sm" onClick={() => handleResolve(sub.id)}>
                          <CheckCircle className="h-4 w-4" /> Mark as Resolved
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
