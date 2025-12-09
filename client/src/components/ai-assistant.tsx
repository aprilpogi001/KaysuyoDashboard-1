import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Sparkles, Maximize2, Minimize2, Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  isTyping?: boolean;
}

function ThinkingAnimation() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
      <div className="flex items-center gap-1">
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="text-xs">Nag-iisip...</span>
    </div>
  );
}

function SearchingAnimation() {
  return (
    <motion.div 
      className="flex items-center gap-2 text-muted-foreground text-sm py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Globe className="w-4 h-4 text-primary" />
      </motion.div>
      <span className="text-xs">Searching in web..</span>
    </motion.div>
  );
}

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        const charsToAdd = Math.min(3, text.length - currentIndex);
        setDisplayedText(prev => prev + text.slice(currentIndex, currentIndex + charsToAdd));
        setCurrentIndex(prev => prev + charsToAdd);
      }, 15);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <motion.span
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
    >
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-primary ml-0.5"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.span>
  );
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Kumusta! Ako ang KNHS Assistant, gawa ng Norch Team. Paano kita matutulungan ngayon? Pwede mo akong tanungin tungkol sa attendance, school rules, o i-navigate ka sa iba't ibang pages ng dashboard.", sender: "ai" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const messageContainsSearch = input.toLowerCase().includes("search") || 
                                   input.toLowerCase().includes("hanapin") ||
                                   input.toLowerCase().includes("look up");
    if (messageContainsSearch) {
      setIsSearching(true);
    }

    try {
      const response = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const newMessageId = Date.now() + 1;
      setTypingMessageId(newMessageId);
      
      setMessages(prev => [...prev, { 
        id: newMessageId, 
        text: data.message, 
        sender: "ai",
        isTyping: true
      }]);

      if (data.navigation) {
        setTimeout(() => {
          setLocation(data.navigation);
          setMessages(prev => [...prev, { 
            id: Date.now() + 2, 
            text: `Dinala na kita sa ${data.navigation}. Meron ka pa bang ibang tanong?`, 
            sender: "ai" 
          }]);
        }, 1000);
      }

    } catch (error: any) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `Pasensya na, may problema sa AI service. Subukan mo ulit mamaya.`, 
        sender: "ai" 
      }]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleTypingComplete = (messageId: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isTyping: false } : msg
    ));
    setTypingMessageId(null);
  };

  const quickActions = [
    { label: "Dashboard", action: () => setLocation("/") },
    { label: "Attendance", action: () => setLocation("/attendance") },
    { label: "Scanner", action: () => setLocation("/scanner") },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed z-50 shadow-2xl transition-all duration-300",
              isExpanded 
                ? "inset-4 md:inset-8" 
                : "bottom-20 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-[420px] max-w-[420px]"
            )}
          >
            <Card className="border-primary/20 shadow-xl h-full flex flex-col overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg p-3 md:p-4 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <CardTitle className="text-sm font-medium">KNHS Assistant</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsExpanded(!isExpanded)}
                    data-testid="button-expand-chat"
                  >
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
                <div 
                  ref={scrollContainerRef}
                  className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4",
                    isExpanded ? "max-h-full" : "max-h-[300px] md:max-h-[350px]"
                  )}
                  style={{ 
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                          msg.sender === "user"
                            ? "ml-auto bg-primary text-primary-foreground max-w-[85%]"
                            : "bg-muted max-w-[90%]"
                        )}
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {msg.sender === "ai" && msg.isTyping && typingMessageId === msg.id ? (
                          <TypewriterText 
                            text={msg.text} 
                            onComplete={() => handleTypingComplete(msg.id)} 
                          />
                        ) : (
                          msg.text
                        )}
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="bg-muted max-w-[90%] rounded-lg px-3 py-2">
                        {isSearching ? <SearchingAnimation /> : <ThinkingAnimation />}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="px-3 pb-2 flex gap-1 flex-wrap shrink-0 border-t pt-2">
                  {quickActions.map((action) => (
                    <Button 
                      key={action.label} 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={action.action}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="p-3 pt-0 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex w-full items-center space-x-2"
                >
                  <Input
                    id="message"
                    placeholder="Type your message..."
                    className="flex-1 text-sm"
                    autoComplete="off"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-ai-message"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || isLoading} data-testid="button-send-message">
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="button-ai-assistant"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="sr-only">Toggle AI Assistant</span>
      </motion.button>
    </>
  );
}
