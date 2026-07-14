import { useRoute, useLocation, Link } from "wouter";
import { useScanStore, ScanRecord } from "@/store/scan-store";
import { useRef } from "react";
import { exportReportToPdf } from "@/services/file-parser";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, 
  Download, ArrowLeft, Activity, Info, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Result() {
  const [match, params] = useRoute("/result/:id");
  const [, setLocation] = useLocation();
  const { getScan, scans } = useScanStore();
  
  const reportRef = useRef<HTMLDivElement>(null);

  // If no ID provided, show the most recent scan
  const id = params?.id || (scans.length > 0 ? scans[0].id : null);
  const scan = id ? getScan(id) : undefined;

  if (!scan) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Analysis Found</h2>
        <p className="text-muted-foreground mb-6">The requested report does not exist or was deleted.</p>
        <Link href="/">
          <Button variant="outline" className="font-mono">Return to Sandbox</Button>
        </Link>
      </div>
    );
  }

  const { score, level, category, reasons, highlights } = scan.resultPayload;
  
  const colorMap: Record<string, { color: string; bg: string; border: string; glow: string; icon: any; label: string }> = {
    low: { color: 'text-safe', bg: 'bg-safe', border: 'border-safe/30', glow: 'glow-safe', icon: ShieldCheck, label: 'SAFE / BENIGN' },
    medium: { color: 'text-warning', bg: 'bg-warning', border: 'border-warning/30', glow: 'glow-warning', icon: AlertTriangle, label: 'SUSPICIOUS / WARNING' },
    high: { color: 'text-destructive', bg: 'bg-destructive', border: 'border-destructive/30', glow: 'glow-danger', icon: ShieldAlert, label: 'CRITICAL THREAT / SCAM' }
  };
  
  const config = colorMap[level] || colorMap.medium;
  const Icon = config.icon;

  // Highlight original text
  const renderHighlightedText = () => {
    if (!scan.originalText) return <span className="text-muted-foreground italic">No original content recorded.</span>;
    if (!highlights || highlights.length === 0) return <span className="whitespace-pre-wrap font-mono text-sm">{scan.originalText}</span>;

    // Sort highlights by start position
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    
    const elements = [];
    let currentIndex = 0;
    
    for (let i = 0; i < sorted.length; i++) {
      const h = sorted[i];
      // Avoid overlapping highlights
      if (h.start < currentIndex) continue;
      
      // Text before highlight
      if (h.start > currentIndex) {
        elements.push(<span key={`text-${i}`}>{scan.originalText.substring(currentIndex, h.start)}</span>);
      }
      
      // Highlighted text
      elements.push(
        <mark key={`mark-${i}`} className={`bg-destructive/30 text-destructive-foreground px-1 py-0.5 rounded border border-destructive/50 font-bold mx-0.5`} title="Flagged phrase">
          {scan.originalText.substring(h.start, h.end)}
        </mark>
      );
      
      currentIndex = h.end;
    }
    
    // Remaining text
    if (currentIndex < scan.originalText.length) {
      elements.push(<span key={`text-end`}>{scan.originalText.substring(currentIndex)}</span>);
    }
    
    return <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{elements}</div>;
  };

  const handleExport = () => {
    exportReportToPdf(scan, reportRef as React.RefObject<HTMLDivElement>);
  };

  return (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-bottom-4 duration-500 pb-12">
      
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" className="font-mono text-muted-foreground hover:text-foreground -ml-4" onClick={() => setLocation('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> NEW SCAN
        </Button>
        <Button variant="outline" className="font-mono border-primary/30 text-primary hover:bg-primary/10" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> EXPORT REPORT
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6">
        
        {/* Main Threat Meter Card */}
        <div className={`glass-panel rounded-xl border p-8 md:p-12 relative overflow-hidden ${config.border}`}>
          <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 blur-3xl rounded-full ${config.bg} ${config.glow}`} />
          
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between relative z-10">
            
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/40 border border-border/50 rounded-full text-xs font-mono font-medium text-muted-foreground mb-2">
                <Activity className="w-3.5 h-3.5" />
                Scan ID: {scan.id.split('-')[0]}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">

              {level === "high"
                  ? " PHISHING DETECTED"
                  : level === "medium"
                  ? " SUSPICIOUS CONTENT"
                  : " SAFE CONTENT"}

              </h1>
              
              <div className={`text-xl font-mono font-bold font-medium ${config.color} flex items-center justify-center md:justify-start gap-3`}>
                <Icon className="w-6 h-6" />
                {config.label}
              </div>
            </div>
            
            <div className="shrink-0 relative">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" className="stroke-muted/30" strokeWidth="8" />
                <circle 
                  cx="80" cy="80" r="70" 
                  fill="none" 
                  className={config.color.replace('text-', 'stroke-')} 
                  strokeWidth="8" 
                  strokeDasharray="439.8" 
                  strokeDashoffset={439.8 - (439.8 * score) / 100} 
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-display font-bold">

                {score}

                </span>

                <div className="text-xs text-muted-foreground mt-2">

                AI + Rule Engine

                </div>
                <span className="text-[10px] text-muted-foreground font-mono mt-1">Risk Score</span>
              </div>
            </div>

          </div>
          
          {/* Risk Gauge Bar */}
          <div className="mt-12 pt-8 border-t border-border/40">
            <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
              <span>Safe</span>
              <span>Suspicious</span>
              <span>Danger</span>
            </div>
            <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden flex">
              <div className="h-full bg-safe/20 flex-[33] border-r border-background" />
              <div className="h-full bg-warning/20 flex-[33] border-r border-background" />
              <div className="h-full bg-destructive/20 flex-[34]" />
              <div 
                className={`absolute h-4 w-1 shadow-lg transform -translate-y-0.5 transition-all duration-1000 ${config.bg} ${config.glow}`}
                style={{ left: `calc(${score}% - 2px)` }}
              />
            </div>
          </div>
        </div>
        <div className="glass-panel border border-primary/20 rounded-xl p-6 mb-6">

          <h3 className="font-display font-bold text-lg mb-6">
            🧠 Local AI Analysis
          </h3>

          {(() => {
            const aiReason = reasons.find(r => r.startsWith("🧠 AI"));

            const confidence =
              aiReason?.match(/\((.*?)%\)/)?.[1] || "0";

            const prediction =
              aiReason?.includes("PHISHING")
                ? "PHISHING"
                : "SAFE";

            return (

              <div className="grid md:grid-cols-4 gap-4">

                <div className="rounded-lg border p-4">

                  <div className="text-xs text-muted-foreground mb-1">
                    Model
                  </div>

                  <div className="font-bold">
                    SilentShieldNet
                  </div>

                </div>

                <div className="rounded-lg border p-4">

                  <div className="text-xs text-muted-foreground mb-1">
                    Prediction
                  </div>

                  <div className="font-bold text-red-500">
                    {prediction}
                  </div>

                </div>

                <div className="rounded-lg border p-4">

                  <div className="text-xs text-muted-foreground mb-1">
                    Confidence
                  </div>

                  <div className="font-bold">
                    {confidence}%
                  </div>

                </div>

                <div className="rounded-lg border p-4">

                  <div className="text-xs text-muted-foreground mb-1">
                    Running
                  </div>

                  <div className="text-green-500 font-bold">
                    ✓ On Device
                  </div>

                </div>

              </div>

            );

          })()}

        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Reasons Panel */}
          <div className="glass-panel border border-border/40 rounded-xl p-6">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 border-b border-border/40 pb-4">
              🧠 Threat Intelligence Report
            </h3>
            
            {reasons.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm italic py-4">No suspicious indicators found.</p>
            ) : (
              <ul className="space-y-4">
                {reasons.map((reason: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-mono p-3 bg-muted/10 border border-border/30 rounded-md">
                    <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Source Material Panel */}
          <div className="glass-panel border border-border/40 rounded-xl p-6 flex flex-col">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 border-b border-border/40 pb-4">
              <FileText className="w-5 h-5 text-primary" /> Evidence
            </h3>
            
            <div className="flex-1 bg-background/50 border border-border/30 rounded-lg p-4 overflow-y-auto max-h-[400px]">
              {renderHighlightedText()}
            </div>
            <div className="mt-4 text-xs font-mono text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded bg-destructive/50" /> Highlighted phrases contributed to risk score
            </div>
          </div>

        </div>
        
        {/* Footer info for PDF export context */}
        <div className="text-center text-xs font-mono text-muted-foreground opacity-50 pt-8 pb-4">
          RSilentShield AI • Local AI Security Engine

Model : SilentShieldNet v1

100% On Device

No Cloud Processing

Generated on {new Date(scan.timestamp).toLocaleString()} on {new Date(scan.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}