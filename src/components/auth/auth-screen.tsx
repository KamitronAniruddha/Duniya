
"use client";

import { useState, useEffect } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDocs, collection, query, where, limit, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, CheckCircle2, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [view, setView] = useState<"login" | "signup" | "loggedOut">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [signatureType, setSignatureType] = useState<"ani" | "sanu">("ani");

  useEffect(() => {
    const justLoggedOut = localStorage.getItem("justLoggedOut");
    if (justLoggedOut === "true") {
      setView("loggedOut");
      localStorage.removeItem("justLoggedOut");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    try {
      if (view === "login") {
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
          displayName: username.trim()
        });

        const userRef = doc(db, "users", user.uid);
        
        const userData = {
          id: user.uid,
          displayName: username.trim(),
          username: cleanUsername,
          email: cleanEmail,
          photoURL: "",
          bio: "Welcome to Duniya!",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          onlineStatus: "online",
          lastOnlineAt: new Date().toISOString(),
          isBlocked: false,
          serverIds: [],
          allowGroupInvites: true,
          showOnlineStatus: true,
          interfaceMode: "laptop"
        };
        
        await setDoc(userRef, userData, { merge: true });
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

  const renderLoggedOut = () => (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md flex flex-col items-center justify-center"
      >
        <Card className="border-none shadow-2xl bg-card overflow-hidden rounded-[2.5rem] w-full">
          <CardHeader className="text-center pt-10 pb-6 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="flex justify-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
            </div>
            <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground">Logged Out</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2 px-8">
              You have successfully disconnected from the Verse. Come back soon!
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-4">
            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              onClick={() => setView("login")}
            >
              Sign In Again
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest border-2"
              onClick={() => setView("signup")}
            >
              Create New Account
            </Button>
          </CardContent>
          <div className="p-4 bg-muted/20 border-t flex items-center justify-center">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              <span>Duniya Messenger Verified</span>
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <span>Aniruddha ❤️</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );

  return (
    <div className="fixed inset-0 w-full flex flex-col bg-background overflow-y-auto custom-scrollbar selection:bg-primary/30">
      <div className="min-h-svh w-full flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {view === "loggedOut" ? (
            <motion.div key="logged-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md h-full">
              {renderLoggedOut()}
            </motion.div>
          ) : (
            <motion.div key="auth-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md flex flex-col items-center">
              <Card className="w-full shadow-2xl border-none bg-card animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="space-y-0.5 text-center pb-1 pt-4">
                  <div className="flex flex-col items-center mb-1">
                    <div className="p-2 bg-primary/10 rounded-[1.25rem] shadow-inner animate-bounce [animation-duration:4s]">
                      <Logo size={32} />
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setSignatureType(prev => prev === "ani" ? "sanu" : "ani")}
                      className="h-10 w-32 flex items-center justify-center outline-none group cursor-pointer"
                    >
                      <AnimatePresence mode="wait">
                        {signatureType === "ani" ? (
                          <motion.svg key="ani-sig" width="80" height="36" viewBox="0 0 80 36" fill="none" className="text-primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.path 
                              d="M10,25 L20,5 L35,25 M12,18 H28 M45,25 V12 C45,8 55,8 55,12 V25 M65,12 V25 M65,5 V8" 
                              stroke="currentColor" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              initial={{ pathLength: 0 }} 
                              animate={{ pathLength: 1 }} 
                              transition={{ duration: 1.5 }} 
                            />
                          </motion.svg>
                        ) : (
                          <motion.svg key="sanu-sig" width="100" height="36" viewBox="0 0 100 36" fill="none" className="text-primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <motion.path 
                              d="M20,25 C20,10 35,5 35,15 C35,25 20,30 30,30 C40,30 45,20 45,15 M50,25 V12 C50,8 60,8 60,12 V25 M65,25 V12 C65,8 75,8 75,12 V25 M80,12 V20 C80,25 95,25 95,12" 
                              stroke="currentColor" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              initial={{ pathLength: 0 }} 
                              animate={{ pathLength: 1 }} 
                              transition={{ duration: 1.8 }} 
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                  
                  <CardTitle className="text-xl font-black tracking-tighter text-foreground uppercase">Duniya</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {view === "login" ? "Welcome back to the Verse" : "Join the modern community platform"}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-2 px-6 md:px-8 pt-2">
                    {view === "signup" && (
                      <div className="space-y-0.5">
                        <Label htmlFor="username" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground ml-1">Unique Username</Label>
                        <Input id="username" placeholder="johndoe" required value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <Label htmlFor="email" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground ml-1">Email Address</Label>
                      <Input id="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="password" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground ml-1">Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                    {view === "signup" && (
                      <div className="space-y-0.5">
                        <Label htmlFor="confirmPassword" className="text-[8px] font-black uppercase tracking-wider text-muted-foreground ml-1">Confirm Password</Label>
                        <Input id="confirmPassword" type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="bg-muted/50 border-none h-9 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-3 px-6 md:px-8 pb-4 pt-1">
                    <Button type="submit" className="w-full h-10 text-sm font-black rounded-xl shadow-xl shadow-primary/20 uppercase tracking-widest" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (view === "login" ? "Sign In" : "Create Account")}
                    </Button>
                    <button type="button" className="text-[9px] text-primary hover:text-primary/80 font-black tracking-widest transition-colors uppercase" onClick={() => { setView(view === "login" ? "signup" : "login"); setShowPassword(false); }} disabled={isLoading}>
                      {view === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                  </CardFooter>
                </form>
              </Card>
              
              <div className="flex flex-col items-center gap-2 mt-4 mb-2">
                <div className="flex items-center gap-2 px-4 py-1 bg-muted/40 backdrop-blur-md rounded-full border border-border shadow-sm">
                  <span className="text-[7px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Made by Aniruddha with love</span>
                  <Heart className="h-2 w-2 text-red-500 fill-red-500 animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
