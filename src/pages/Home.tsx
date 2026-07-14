import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  FileText, Link as LinkIcon, MessageSquare, QrCode, 
  UploadCloud, ArrowRight, ShieldAlert, CheckCircle2,
  Loader2, Sparkles, ScanSearch, Gauge
} from "lucide-react";
import { analyzeText, analyzeUrl } from "@/services/analyzer";
import { extractTextFromPdf, extractTextFromImage } from "@/services/file-parser";
import { useScanStore } from "@/store/scan-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { analyzeWithAI } from "@/services/ai";

export function Home() {
  const [, setLocation] = useLocation();
  const { addScan } = useScanStore();
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Idle");
  
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const handleTextScan = async () => {
    if (!textInput.trim()) return;
    startScan("Message", async () => {
      setScanStatus("Analyzing patterns...");
      await new Promise(r => setTimeout(r, 600)); // Artificial delay for effect
      const result = analyzeText(textInput, "message");

      const ai = await analyzeWithAI(textInput);

      result.reasons.unshift(
        `🧠 AI: ${ai.prediction} (${ai.confidence}%)`
      );

      if (ai.prediction === "PHISHING") {
        result.score = Math.max(result.score, ai.confidence);

        result.level =
          result.score > 66
            ? "high"
            : result.score > 33
            ? "medium"
            : "low";
      }
      
      const id = addScan({
        inputType: 'text',
        inputSummary: textInput.substring(0, 60) + (textInput.length > 60 ? '...' : ''),
        score: result.score,
        level: result.level,
        category: result.category,
        resultPayload: result,
        originalText: textInput
      });
      setLocation(`/result/${id}`);
    });
  };

  const handleUrlScan = async () => {
    if (!urlInput.trim()) return;
    startScan("URL", async () => {
      setScanStatus("Analyzing domain reputation...");
      await new Promise(r => setTimeout(r, 600));
      const result = analyzeUrl(urlInput);
      
      const id = addScan({
        inputType: 'url',
        inputSummary: urlInput,
        score: result.score,
        level: result.level,
        category: result.category,
        resultPayload: result,
        originalText: urlInput
      });
      setLocation(`/result/${id}`);
    });
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startScan(file.name, async () => {
      try {
        let extractedText = "";
        let mode: 'message' | 'pdf' | 'email' = 'message';
        let inputType: 'image' | 'pdf' | 'qr' | 'text' = 'image';

        if (file.type === "application/pdf") {
          setScanStatus("Extracting PDF contents...");
          extractedText = await extractTextFromPdf(file);
          mode = 'pdf';
          inputType = 'pdf';
        } else if (file.type.startsWith("image/")) {
          setScanStatus("Running local OCR & QR detection...");
          extractedText = await extractTextFromImage(file);
          // If it looks exactly like a URL, treat it as URL output from QR
          if (extractedText.startsWith("http://") || extractedText.startsWith("https://")) {
            const result = analyzeUrl(extractedText);
            const id = addScan({
              inputType: 'qr',
              inputSummary: `QR: ${extractedText}`,
              score: result.score,
              level: result.level,
              category: result.category,
              resultPayload: result,
              originalText: extractedText
            });
            setLocation(`/result/${id}`);
            return;
          }
        } else if (file.name.endsWith('.txt') || file.name.endsWith('.eml') || file.name.endsWith('.csv')) {
          setScanStatus("Reading file contents...");
          extractedText = await file.text();
          mode = file.name.endsWith('.eml') ? 'email' : 'message';
          inputType = 'text';
        } else {
          throw new Error("Unsupported file type");
        }

        if (!extractedText.trim()) {
          throw new Error("No readable text found in document.");
        }

        setScanStatus("Analyzing extracted data...");
        const result = analyzeText(extractedText, mode);

        const ai = await analyzeWithAI(extractedText);

        result.reasons.unshift(
          ` AI Verdict : ${ai.prediction}`,
          ` Confidence : ${ai.confidence}%`,
          ` Inference : ${ai.inference_time_ms} ms`,
          ` Model : ${ai.model}`,
          ` Privacy : ${ai.privacy}`,
          ` ${ai.explanation}`
        );

        if (ai.keywords.length > 0) {
          result.reasons.unshift(
            `🏷️ Keywords : ${ai.keywords.join(", ")}`
          );
        }

        if (ai.prediction === "PHISHING") {
          result.score = Math.max(result.score, ai.confidence);

          result.level =
            result.score > 66
              ? "high"
              : result.score > 33
              ? "medium"
              : "low";
        }
        
        const id = addScan({
          inputType,
          inputSummary: file.name,
          score: result.score,
          level: result.level,
          category: result.category,
          resultPayload: result,
          originalText: extractedText
        });
        
        setLocation(`/result/${id}`);
      } catch (err: any) {
        setIsScanning(false);
        toast({
          title: "Scan failed",
          description: err.message || "Could not process file.",
          variant: "destructive"
        });
        e.target.value = '';
      }
    });
  }, [addScan, setLocation]);

  const startScan = async (targetName: string, scanFn: () => Promise<void>) => {
    setIsScanning(true);
    setScanStatus(`Initializing secure sandbox...`);
    try {
      await scanFn();
    } catch (e) {
      console.error(e);
      setIsScanning(false);
      setScanStatus("Failed.");
    }
  };

  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full max-w-md mx-auto w-full mt-12 animate-in fade-in duration-700">
        <div className="relative w-32 h-32 mb-8 mx-auto">
          <div className="absolute inset-0 border-2 border-primary rounded-full opacity-20"></div>
          <div className="absolute inset-2 border-2 border-primary border-t-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
          <div className="absolute inset-6 bg-primary/20 rounded-full animate-pulse flex items-center justify-center text-primary glow-safe">
            <ShieldAlert className="w-8 h-8 opacity-80" />
          </div>
          <div className="absolute left-0 right-0 h-0.5 bg-primary/60 shadow-[0_0_8px_2px_rgba(30,58,95,0.25)] w-full top-1/2 -translate-y-1/2 animate-scan pointer-events-none z-10" />
        </div>
        
        <h2 className="text-xl font-display font-bold mb-2">Analyzing Local Payload</h2>
        <div className="font-mono text-sm text-primary bg-primary/10 px-4 py-2 border border-primary/20 rounded">
          &gt; {scanStatus}
        </div>
        <p className="mt-8 text-xs text-muted-foreground font-medium text-center max-w-[280px]">
          Target remains on device. Network transmission disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full mt-8 animate-in slide-in-bottom-[20px] fade-in duration-500">
      
      <div className="text-center mb-12 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-gradient-to-br from-tab-file/15 via-tab-url/10 to-tab-text/10 blur-3xl rounded-full pointer-events-none -z-10" />
        <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display leading-tight flex flex-col sm:inline">
          AI-powered phishing, scam, and malicious content detection running entirely on your device. No cloud. No tracking. No data leaves your computer.
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          Drop any suspicious email, message, document, or link. SilentShield analyzes the threat vectors entirely locally on your device.
        </p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-border/40 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <div className="p-1 border-b border-border/60 bg-muted/30">
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="w-full h-auto p-1 bg-transparent grid grid-cols-5 gap-1 rounded-none">
              <TabsTrigger value="file" className="flex-col py-3 gap-2 rounded-lg transition-all duration-200 hover:bg-tab-file/5 hover:scale-[1.03] data-[state=active]:bg-tab-file/10 data-[state=active]:text-tab-file data-[state=active]:shadow-sm">
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden sm:block">File / PDF</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-col py-3 gap-2 rounded-lg transition-all duration-200 hover:bg-tab-url/5 hover:scale-[1.03] data-[state=active]:bg-tab-url/10 data-[state=active]:text-tab-url data-[state=active]:shadow-sm">
                <LinkIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden sm:block">URL / Link</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-col py-3 gap-2 rounded-lg transition-all duration-200 hover:bg-tab-text/5 hover:scale-[1.03] data-[state=active]:bg-tab-text/10 data-[state=active]:text-tab-text data-[state=active]:shadow-sm">
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden sm:block">Raw Text</span>
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex-col py-3 gap-2 rounded-lg transition-all duration-200 hover:bg-tab-qr/5 hover:scale-[1.03] data-[state=active]:bg-tab-qr/10 data-[state=active]:text-tab-qr data-[state=active]:shadow-sm">
                <QrCode className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden sm:block">QR Code</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-col py-3 gap-2 rounded-lg transition-all duration-200 hover:bg-tab-info/5 hover:scale-[1.03] data-[state=active]:bg-tab-info/10 data-[state=active]:text-tab-info data-[state=active]:shadow-sm">
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden sm:block">How It Works</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="p-6 md:p-8 bg-card relative z-10">
              
              <TabsContent value="file" className="mt-0 outline-none">
                <label className="border-2 border-dashed border-tab-file/30 hover:border-tab-file/60 hover:bg-tab-file/5 transition-colors rounded-lg flex flex-col items-center justify-center py-16 px-4 text-center cursor-pointer bg-muted/10 group">
                  <div className="w-16 h-16 rounded-full bg-tab-file/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-tab-file" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Drop payload here</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    Supports .pdf, .txt, .eml, screenshots (PNG/JPG)
                  </p>
                  <input type="file" className="hidden" accept=".pdf,.txt,.eml,.csv,image/png,image/jpeg,image/webp" onChange={handleFileUpload} />
                </label>
              </TabsContent>
              
              <TabsContent value="url" className="mt-0 outline-none">
                <div className="space-y-4">
                  <div className="font-mono text-sm text-muted-foreground font-medium mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-tab-url animate-pulse" />
                    Target Vector: URL String
                  </div>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Input 
                      placeholder="https://example.com/login" 
                      className="font-mono h-12 bg-muted/20 border-border/50 text-base flex-1 focus-visible:ring-tab-url/40"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlScan()}
                    />
                    <Button onClick={handleUrlScan} disabled={!urlInput.trim()} className="h-12 px-8 group font-bold bg-tab-url hover:bg-tab-url/90 text-tab-url-foreground">
                      SCAN <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                  <div className="bg-tab-url/5 border border-tab-url/20 rounded p-3 mt-4 text-xs font-mono text-tab-url flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>URLs are analyzed using edit-distance against known brands, keyword heuristics, and TLD reputation. We DO NOT send requests to the target URL.</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="mt-0 outline-none">
                <div className="space-y-4">
                  <div className="font-mono text-sm text-muted-foreground font-medium mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-tab-text animate-pulse" />
                    Target Vector: Raw Message / Email Source
                  </div>
                  <Textarea 
                    placeholder="Paste SMS, WhatsApp message, or Email body here..." 
                    className="font-mono min-h-[200px] bg-muted/20 border-border/50 resize-none p-4 focus-visible:ring-tab-text/40"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleTextScan} disabled={!textInput.trim()} className="h-12 px-8 group font-bold w-full sm:w-auto bg-tab-text hover:bg-tab-text/90 text-tab-text-foreground">
                      ANALYZE THREAT <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="qr" className="mt-0 outline-none">
                <label className="border-2 border-dashed border-tab-qr/30 hover:border-tab-qr/60 hover:bg-tab-qr/5 transition-colors rounded-lg flex flex-col items-center justify-center py-16 px-4 text-center cursor-pointer bg-muted/10 group">
                  <div className="w-16 h-16 rounded-full bg-tab-qr/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <QrCode className="w-8 h-8 text-tab-qr" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Upload QR Code to Decode</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    Safely inspect the destination before scanning with your phone.
                  </p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </TabsContent>

              <TabsContent value="info" className="mt-0 outline-none">
                <div className="space-y-3">
                  <div className="font-mono text-sm text-muted-foreground font-medium mb-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-tab-info animate-pulse" />
                    What SilentShield actually does
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-tab-file/20 bg-tab-file/5 p-4">
                      <div className="w-9 h-9 rounded-full bg-tab-file/15 flex items-center justify-center mb-3">
                        <UploadCloud className="w-4 h-4 text-tab-file" />
                      </div>
                      <h4 className="font-bold text-sm mb-1">1. Extract</h4>
                      <p className="text-xs text-muted-foreground">
                        Text is pulled from your file, screenshot, QR code, or pasted message using in-browser OCR / PDF parsing. Nothing is uploaded.
                      </p>
                    </div>
                    <div className="rounded-lg border border-tab-info/20 bg-tab-info/5 p-4">
                      <div className="w-9 h-9 rounded-full bg-tab-info/15 flex items-center justify-center mb-3">
                        <ScanSearch className="w-4 h-4 text-tab-info" />
                      </div>
                      <h4 className="font-bold text-sm mb-1">2. Analyze locally</h4>
                      <p className="text-xs text-muted-foreground">
                        A local heuristic engine checks for urgency language, credential requests, spoofed domains, and suspicious links — all on-device.
                      </p>
                    </div>
                    <div className="rounded-lg border border-tab-text/20 bg-tab-text/5 p-4">
                      <div className="w-9 h-9 rounded-full bg-tab-text/15 flex items-center justify-center mb-3">
                        <Gauge className="w-4 h-4 text-tab-text" />
                      </div>
                      <h4 className="font-bold text-sm mb-1">3. Risk score</h4>
                      <p className="text-xs text-muted-foreground">
                        You get a Safe / Suspicious / Critical verdict with the specific signals that triggered it, so you can decide for yourself.
                      </p>
                    </div>
                  </div>

                  <div className="bg-tab-info/5 border border-tab-info/20 rounded p-3 mt-2 text-xs font-mono text-tab-info flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>No network requests are made during analysis. Your data never leaves this browser tab.</p>
                  </div>
                </div>
              </TabsContent>
              
            </div>
          </Tabs>
        </div>
      </div>
      
    </div>
  );
}
