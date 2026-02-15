
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
      <div className="min-h-svh w-full flex flex-col items-center p-4 py-8 md:py-12">
        <Card className="w-full max-w-md shadow-2xl border-none bg-card animate-in fade-in zoom-in-95 duration-500 my-auto">
          <CardHeader className="space-y-1 text-center pb-2 pt-6">
            <div className="flex flex-col items-center mb-2">
              <div className="p-2.5 bg-primary/10 rounded-[1.25rem] shadow-inner animate-bounce [animation-duration:4s]">
                <Logo size={36} />
              </div>
              
              {/* Animated Interactive Handwriting Signature */}
              <button 
                type="button"
                onClick={() => setSignatureType(prev => prev === "ani" ? "sanu" : "ani")}
                className="h-12 w-32 flex items-center justify-center -mt-1 outline-none group cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  {signatureType === "ani" ? (
                    <motion.svg
                      key="ani-sig"
                      width="80"
                      height="40"
                      viewBox="0 0 80 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary transition-transform group-hover:scale-110"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <motion.path
                        d="M15,30 L25,10 L35,30 M20,22 L30,22 M45,30 L45,20 C45,16 55,16 55,20 L55,30 M65,20 L65,30 M65,12 L65,14"
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
                      height="40"
                      viewBox="0 0 100 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary transition-transform group-hover:scale-110"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <motion.path
                        d="M15,25 C15,15 25,15 25,20 C25,25 15,25 15,30 C15,35 25,35 25,30 M35,30 C35,25 45,25 45,30 C45,35 35,35 35,30 M45,25 L45,35 M55,35 L55,25 C55,20 65,20 65,25 L65,35 M75,25 L75,30 C75,35 85,35 85,30 L85,25 M85,25 L85,35"
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
            
            <CardTitle className="text-2xl font-black tracking-tighter text-foreground uppercase">Duniya</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {isLogin ? "Welcome back to the Verse" : "Join the modern community platform"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 px-6 md:px-8 pt-4">
              {!isLogin && (
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Unique Username</Label>
                  <Input 
                    id="username" 
                    placeholder="johndoe" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/50 border-none h-10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted/50 border-none h-10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted/50 border-none h-10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              {!isLogin && (
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80 ml-1">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-muted/50 border-none h-10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 px-6 md:px-8 pb-6 pt-2">
              <Button type="submit" className="w-full h-11 text-sm font-black rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
              </Button>
              <button 
                type="button"
                className="text-[10px] text-primary hover:text-primary/80 font-black tracking-widest transition-colors uppercase"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="flex flex-col items-center gap-3 mt-6 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/40 backdrop-blur-md rounded-full border border-border shadow-sm">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Made by Aniruddha with love</span>
            <Heart className="h-2.5 w-2.5 text-red-500 fill-red-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
