import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalysisResult } from '@/services/analyzer';

export interface ScanRecord {
  id: string;
  timestamp: number;
  inputType: 'image' | 'pdf' | 'text' | 'url' | 'qr';
  inputSummary: string;
  score: number;
  level: 'low' | 'medium' | 'high';
  category: string;
  resultPayload: AnalysisResult;
  originalText?: string;
}

interface ScanState {
  scans: ScanRecord[];
  addScan: (scan: Omit<ScanRecord, 'id' | 'timestamp'>) => string;
  removeScan: (id: string) => void;
  clearHistory: () => void;
  getScan: (id: string) => ScanRecord | undefined;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      scans: [],
      addScan: (scanData) => {
        const id = crypto.randomUUID();
        const newScan: ScanRecord = {
          ...scanData,
          id,
          timestamp: Date.now(),
        };
        set((state) => ({ scans: [newScan, ...state.scans] }));
        return id;
      },
      removeScan: (id) =>
        set((state) => ({ scans: state.scans.filter((s) => s.id !== id) })),
      clearHistory: () => set({ scans: [] }),
      getScan: (id) => get().scans.find((s) => s.id === id),
    }),
    {
      name: 'silentshield-scans',
    }
  )
);
