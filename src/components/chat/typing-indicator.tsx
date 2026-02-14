export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-4 py-2 text-xs text-muted-foreground italic">
      <div className="flex space-x-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
      </div>
      <span>Someone is typing...</span>
    </div>
  );
}