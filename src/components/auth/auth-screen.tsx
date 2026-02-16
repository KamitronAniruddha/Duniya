
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
          <div className="p-4 bg-muted/20 border-t flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              <span>Duniya Messenger Verified</span>
            </div>
            <SignatureSVG type="ani" size={60} className="text-primary/40" />
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
                      className="h-12 w-40 flex items-center justify-center outline-none group cursor-pointer"
                    >
                      <SignatureSVG type={signatureType} size={100} />
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
                <div className="flex flex-col items-center gap-1 px-6 py-2 bg-muted/40 backdrop-blur-md rounded-3xl border border-border shadow-sm">
                  <span className="text-[7px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Signature Verified</span>
                  <SignatureSVG type="ani" size={50} className="text-primary/60" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SignatureSVG({ type, size = 80, className }: { type: "ani" | "sanu", size?: number, className?: string }) {
  // Simpler earlier paths for Ani and Sanu
  const aniPath = "M15,35 C5,25 15,5 25,5 C35,5 30,35 30,35 M18,22 H35 M45,35 V22 C45,15 55,15 55,22 V35 C55,15 65,15 65,22 V35 M75,22 V35 M75,10 A1.5,1.5 0 1,1 75,13 A1.5,1.5 0 1,1 75,10";
  const sanuPath = "M20,15 C10,15 10,35 25,35 C40,35 40,5 25,5 C10,5 10,25 25,25 C40,25 50,35 60,35 M65,35 V25 C65,20 75,20 75,25 V35 M85,35 V25 C85,20 95,20 95,25 V35 M105,25 V30 C105,35 115,35 115,30 V25";

  return (
    <AnimatePresence mode="wait">
      <motion.svg 
        key={type} 
        width={size} 
        height={size * 0.4} 
        viewBox={type === "ani" ? "0 0 100 40" : "0 0 120 40"} 
        fill="none" 
        className={cn("text-primary", className)}
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
      >
        <motion.path 
          d={type === "ani" ? aniPath : sanuPath} 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          initial={{ pathLength: 0 }} 
          animate={{ pathLength: 1 }} 
          transition={{ duration: 2, ease: "easeInOut" }} 
        />
      </motion.svg>
    </AnimatePresence>
  );
}
