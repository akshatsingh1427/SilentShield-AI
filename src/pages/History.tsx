import { useScanStore } from "@/store/scan-store";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, 
  Trash2, Search, ArrowRight, ShieldBan,
  FileText, Link as LinkIcon, MessageSquare, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function History() {
  const { scans, removeScan, clearHistory } = useScanStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'url': return <LinkIcon className="w-4 h-4" />;
      case 'text': return <MessageSquare className="w-4 h-4" />;
      case 'qr': return <QrCode className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'low': return { color: 'text-safe', border: 'border-safe/30', icon: ShieldCheck };
      case 'medium': return { color: 'text-warning', border: 'border-warning/30', icon: AlertTriangle };
      case 'high': return { color: 'text-destructive', border: 'border-destructive/30', icon: ShieldAlert };
      default: return { color: 'text-muted-foreground', border: 'border-border', icon: Search };
    }
  };

  if (scans.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-3">No Scan History</h2>
        <p className="text-muted-foreground mb-8 text-sm">
          Your analysis history is stored strictly on this device. You haven't run any scans yet.
        </p>
        <Link href="/">
          <Button className="font-mono">
            START NEW SCAN <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Local Audit Log</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {scans.length} records retained securely on device
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-destructive/30 text-destructive hover:bg-destructive/10 font-mono text-xs"
          onClick={() => {
            if (confirm("Permanently delete all local scan history?")) {
              clearHistory();
            }
          }}
        >
          <ShieldBan className="w-4 h-4 mr-2" /> PURGE LOGS
        </Button>
      </div>

      <div className="space-y-3">
        {scans.map((scan: any, i: number) => {
          const config = getLevelConfig(scan.level);
          const LevelIcon = config.icon;
          
          return (
            <div 
              key={scan.id} 
              className={`glass-panel rounded-lg border flex flex-col sm:flex-row items-stretch sm:items-center p-0 overflow-hidden group animate-in slide-in-bottom-2 fade-in fill-mode-both`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-2 sm:w-1.5 self-stretch ${config.color.replace('text-', 'bg-')}`} />
              
              <Link href={`/result/${scan.id}`} className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/10 transition-colors cursor-pointer">
                
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                  <div className={`p-2 rounded bg-background border ${config.border} shrink-0`}>
                    <LevelIcon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between sm:justify-start gap-3 mb-1">
                      <span className={`font-display font-bold text-sm ${config.color}`}>
                        {scan.category}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        Risk: {scan.score}/100
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground truncate font-mono">
                      {scan.inputSummary}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40 shrink-0 gap-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <div className="p-1 bg-muted/30 rounded">
                      {getIcon(scan.inputType)}
                    </div>
                    {formatDistanceToNow(scan.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </Link>
              
              <button 
                className="px-4 py-4 sm:py-5 border-l border-border/40 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                title="Delete Record"
                onClick={(e) => {
                  e.stopPropagation();
                  removeScan(scan.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
}
