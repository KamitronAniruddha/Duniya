
"use client";

import { useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDocs, collection, query, where, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  
  // State for toggling between Ani and Sanu signature
  const [signatureType, setSignatureType] = useState<"ani" | "sanu">("ani");

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

        const q = query(
          collection(db, "users"), 
          where("username", "==", cleanUsername),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          throw new Error("Username already taken. Please try another one.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { 
          displayName: username.trim(),
          photoURL: "" 
        });

        const userRef = doc(db, "users", user.uid);
        
        const userData = {
          id: user.uid,
          displayName: username.trim(),
          username: cleanUsername,
          email: cleanEmail,
          photoURL: "",
          avatarUrl: "",
          bio: "Welcome to Duniya!",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          onlineStatus: "online",
          lastOnlineAt: new Date().toISOString(),
          isBlocked: false,
          serverIds: [],
          allowGroupInvites: true,
          showOnlineStatus: true
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
    <div className="fixed inset-0 w-full flex flex-col bg-background overflow-y-auto custom-scrollbar selection:bg-primary/30">
      <div className="min-h-svh w-full flex flex-col items-center p-4 py-4 md:py-8">
        <Card className="w-full max-w-md shadow-2xl border-none bg-card animate-in fade-in zoom-in-95 duration-500 my-auto">
          <CardHeader className="space-y-0.5 text-center pb-1 pt-4">
            <div className="flex flex-col items-center mb-1">
              <div className="p-2 bg-primary/10 rounded-[1.25rem] shadow-inner animate-bounce [animation-duration:4s]">
                <Logo size={32} />
              </div>
              
              {/* Animated Interactive Handwriting Signature */}
              <button 
                type="button"
                onClick={() => setSignatureType(prev => prev === "ani" ? "sanu" : "ani")}
                className="h-10 w-32 flex items-center justify-center outline-none group cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  {signatureType === "ani" ? (
                    <motion.svg
                      key="ani-sig"
                      width="80"
                      height="36"
                      viewBox="0 0 80 36"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary transition-transform group-hover:scale-110"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <motion.path
                        d="M15,28 L25,8 L35,28 M20,20 L30,20 M45,28 V18 C45,14 55,14 55,18 V28 M65,18 V28 M65,10 V12"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ 
                          duration: 1.2, 
                          ease: "easeInOut",
                        }}
                      />
                    </motion.svg>
                  ) : (
                    <motion.svg
                      key="sanu-sig"
                      width="100"
                      height="36"
                      viewBox="0 0 100 36"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary transition-transform group-hover:scale-110"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <motion.path
                        d="M30,10 C15,10 15,20 30,20 C45,20 45,30 30,30 M45,30 C45,22 55,22 55,30 V34 M65,34 V22 C65,18 75,18 75,22 V34 M85,22 V30 C85,34 100,34 100,30 V22"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ 
                          duration: 1.5, 
                          ease: "easeInOut",
                        }}
                      />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </button>
            </div>
            
            <CardTitle className="text-xl font-black tracking-tighter text-foreground uppercase">Duniya</CardTitle>
            <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {isLogin ? "Welcome back to the Verse" : "Join the modern community platform"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-2 px-6 md:px-8 pt-2">
              {!isLogin && (
                <div className="space-y-0.5">
                  <Label htmlFor="username" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Unique Username</Label>
                  <Input 
                    id="username" 
                    placeholder="johndoe" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              )}
              <div className="space-y-0.5">
                <Label htmlFor="email" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="password" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              {!isLogin && (
                <div className="space-y-0.5">
                  <Label htmlFor="confirmPassword" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 px-6 md:px-8 pb-4 pt-1">
              <Button type="submit" className="w-full h-10 text-sm font-black rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
              </Button>
              <button 
                type="button"
                className="text-[9px] text-primary hover:text-primary/80 font-black tracking-widest transition-colors uppercase"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="flex flex-col items-center gap-2 mt-4 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="flex items-center gap-2 px-4 py-1 bg-muted/40 backdrop-blur-md rounded-full border border-border shadow-sm">
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Made by Aniruddha with love</span>
            <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
