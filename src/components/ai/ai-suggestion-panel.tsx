"use client";

import { useEffect, useState } from "react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Sparkles, Zap, BookOpen, Search, Loader2 } from "lucide-react";
import { suggestContextualTools, type SuggestedAction } from "@/ai/flows/contextual-tool-suggestion";
import { Card, CardContent } from "@/components/ui/card";

interface AISuggestionPanelProps {
  serverId: string | null;
  channelId: string | null;
}

export function AISuggestionPanel({ serverId, channelId }: AISuggestionPanelProps) {
  const db = useFirestore();
  const { user } = useUser();
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !serverId || !channelId || !user) return null;
    return query(
      collection(db, "communities", serverId, "channels", channelId, "messages"),
      orderBy("sentAt", "desc"),
      limit(5)
    );
  }, [db, serverId, channelId, user?.uid]);

  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (!messages || messages.length === 0 || !user) return;

    const getSuggestions = async () => {
      setIsLoading(true);
      try {
        const history = messages.map(m => ({
          sender: m.senderId === user.uid ? "user" : "assistant",
          content: m.content || ""
        })).reverse();

        const result = await suggestContextualTools({ conversationHistory: history });
        setSuggestions(result.suggestedActions);
      } catch (e) {
        console.error("AI Error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(getSuggestions, 2000);
    return () => clearTimeout(timeout);
  }, [messages, user]);

  return (
    <aside className="w-80 bg-white border-l border-border flex flex-col h-full overflow-hidden">
      <header className="h-14 px-4 border-b flex items-center gap-2 shrink-0">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm">Verse AI Assistant</h3>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            <p className="text-xs text-muted-foreground">Analyzing conversation...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-20 text-center space-y-3 opacity-30">
            <Zap className="h-10 w-10 mx-auto" />
            <p className="text-xs italic px-6">Type something to see AI-powered suggestions</p>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
            {suggestions.map((action, i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-sm text-primary">{action.title}</h4>
                    {action.requiresKnowledgeRetrieval ? (
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Search className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}