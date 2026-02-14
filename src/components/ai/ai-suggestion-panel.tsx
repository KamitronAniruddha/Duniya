"use client";

import { useEffect, useState } from "react";
import { suggestContextualTools, ContextualToolSuggestionOutput } from "@/ai/flows/contextual-tool-suggestion";
import { Message, MOCK_USERS } from "@/lib/mock-data";
import { Sparkles, Loader2, ChevronRight, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AISuggestionPanelProps {
  messages: Message[];
}

export function AISuggestionPanel({ messages }: AISuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<ContextualToolSuggestionOutput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getSuggestions() {
      if (messages.length === 0) return;
      
      setLoading(true);
      try {
        const history = messages.slice(-5).map(msg => ({
          sender: MOCK_USERS[msg.senderId]?.name || 'Unknown',
          content: msg.content
        }));

        const result = await suggestContextualTools({ conversationHistory: history });
        setSuggestions(result);
      } catch (error) {
        console.error("AI Error:", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(getSuggestions, 2000); // Debounce to allow user to finish typing
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <aside className="w-80 bg-white border-l border-border flex flex-col p-4 space-y-4">
      <div className="flex items-center space-x-2 text-primary">
        <Sparkles className="h-5 w-5 fill-primary/20" />
        <h3 className="font-bold text-sm tracking-tight">AI Connect Assist</h3>
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed">
        I analyze context to suggest helpful actions for your conversation.
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3 opacity-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs font-medium">Analyzing context...</span>
        </div>
      ) : suggestions?.suggestedActions && suggestions.suggestedActions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.suggestedActions.map((action, idx) => (
            <Card key={idx} className="group border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-bold text-xs group-hover:text-primary transition-colors">{action.title}</span>
                  {action.requiresKnowledgeRetrieval && (
                    <Badge variant="secondary" className="text-[8px] h-4 px-1 flex items-center bg-teal-100 text-teal-800 border-none">
                      <Zap className="h-2 w-2 mr-0.5 fill-teal-600" /> RAG
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                  {action.description}
                </p>
                <div className="flex justify-end">
                   <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 opacity-40">
           <p className="text-xs italic">Continue chatting to see suggestions</p>
        </div>
      )}
    </aside>
  );
}