
"use client";

import { Sparkles } from "lucide-react";

/**
 * AI Suggestion Panel - Disabled until connected to specific GenAI flows
 */
export function AISuggestionPanel() {
  return (
    <aside className="w-80 bg-white border-l border-border flex flex-col p-4 space-y-4">
      <div className="flex items-center space-x-2 text-primary opacity-50">
        <Sparkles className="h-5 w-5 fill-primary/20" />
        <h3 className="font-bold text-sm tracking-tight">AI Connect Assist</h3>
      </div>
      
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 opacity-40">
           <p className="text-xs italic">AI Assistance is currently unavailable</p>
      </div>
    </aside>
  );
}
