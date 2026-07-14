import { Link, useLocation } from "wouter";
import { ShieldCheck, History as HistoryIcon, ShieldAlert } from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/30">
      <header className="border-b border-border/60 glass-panel sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-none text-foreground">
                SILENT<span className="text-primary">SHIELD</span>
              </span>
              <span className="text-[10px] tracking-normal text-muted-foreground mt-0.5">
                Local Analysis Engine
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/history"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                location === "/history"
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-safe/30 bg-safe/5 text-safe text-xs font-medium glow-safe opacity-80 cursor-help" title="All analysis runs locally in your browser. No data leaves your device.">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-bold">Offline · On-Device</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 py-8 relative">
        {children}
      </main>
      
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground font-medium font-mono">
        <p>Running entirely in-browser. Zero network calls. 100% Private.</p>
      </footer>
    </div>
  );
}
