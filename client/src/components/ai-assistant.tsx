import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Send, Sparkles, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Kumusta! Ako ang KNHS Assistant, gawa ng Norch Team. Paano kita matutulungan ngayon? Pwede mo akong tanungin tungkol sa attendance, school rules, o i-navigate ka sa iba't ibang pages ng dashboard.", sender: "ai" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

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

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: data.message, 
        sender: "ai" 
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
    }
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
            <Card className="border-primary/20 shadow-xl h-full flex flex-col">
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
              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                <ScrollArea className={cn("p-3 md:p-4 flex-1", isExpanded ? "h-full" : "h-[300px] md:h-[350px]")} ref={scrollRef}>
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg px-3 py-2 text-sm break-words",
                          msg.sender === "user"
                            ? "ml-auto bg-primary text-primary-foreground max-w-[85%]"
                            : "bg-muted max-w-[90%]"
                        )}
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {msg.text}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Nag-iisip...</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="px-3 pb-2 flex gap-1 flex-wrap shrink-0">
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
