import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { AiAssistant } from "@/components/ai-assistant";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-h-screen pt-16 md:pt-0">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>
      <AiAssistant />
      <Toaster />
    </div>
  );
}
