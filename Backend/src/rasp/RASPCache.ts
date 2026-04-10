// src/rasp/RASPCache.ts
interface CacheEntry {
  result: boolean;
  timestamp: number;
}

const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5000; // 5 segundos

export function getCachedAnalysis(key: string): boolean | null {
  const entry = analysisCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.result;
  }
  return null;
}

export function setCachedAnalysis(key: string, result: boolean): void {
  analysisCache.set(key, { result, timestamp: Date.now() });
}

export function clearAnalysisCache(): void {
  analysisCache.clear();
}