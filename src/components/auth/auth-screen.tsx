"use client";

import { useState } from "react";
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDocs, collection, query, where, serverTimestamp, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Logo } from "@/components/logo";

export function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        if (cleanUsername.length < 3) throw new Error("Username must be at least 3 characters");

        // 1. Check uniqueness of username
        const q = query(
          collection(db, "users"), 
          where("username", "==", cleanUsername),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          throw new Error("Username already taken. Please try another one.");
        }

        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        // 3. Update Auth profile
        await updateProfile(user, { 
          displayName: username.trim(),
          photoURL: "" 
        });

        // 4. Create Firestore user document
        const userRef = doc(db, "users", user.uid);
        const userData = {
          id: user.uid,
          username: cleanUsername,
          email: cleanEmail,
          photoURL: "",
          bio: "Welcome to Duniya!",
          createdAt: new Date().toISOString(),
          onlineStatus: "online",
          lastSeen: new Date().toISOString(),
          friends: [],
          serverIds: []
        };
        
        setDocumentNonBlocking(userRef, userData, { merge: true });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Auth Error",
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-svh w-full flex flex-col bg-background overflow-y-auto custom-scrollbar selection:bg-primary/30">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md shadow-2xl border-none bg-card mb-12 animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-primary/10 rounded-[2.5rem] shadow-inner animate-bounce duration-[3000ms]">
                <Logo size={64} />
              </div>
            </div>
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground">Duniya</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
              {isLogin ? "Welcome back to the Verse" : "Join the modern community platform"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-8">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-black uppercase tracking-wider text-muted-foreground/80">Unique Username</Label>
                  <Input 
                    id="username" 
                    placeholder="johndoe" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-muted-foreground/80">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-wider text-muted-foreground/80">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-wider text-muted-foreground/80">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/50 border-none h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-6 px-8 pb-10">
              <Button type="submit" className="w-full h-14 text-lg font-black rounded-[1.25rem] shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
              </Button>
              <button 
                type="button"
                className="text-sm text-primary hover:text-primary/80 font-black tracking-tight transition-colors"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 backdrop-blur-md rounded-full border border-border shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Made by Aniruddha with love</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}