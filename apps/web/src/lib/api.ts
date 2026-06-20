// Browser uses the public URL; server-side Next.js uses the internal container URL
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const INTERNAL_API_URL = process.env.REFRACTIQ_INTERNAL_API_URL ?? PUBLIC_API_URL;

function getApiUrl(): string {
  return typeof window !== 'undefined' ? PUBLIC_API_URL : INTERNAL_API_URL;
}

export interface Run {
  id: string;
  status: string;
  userPrompt: string;
  createdAt: number;
  completedAt: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  outputPath: string;
}

export interface Stage {
  id: string;
  runId: string;
  stage: string;
  iteration: number;
  status: string;
  startedAt: number;
  endedAt: number | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface RunStats {
  totalRuns: number;
  totalCost: number;
  avgCost: number;
  totalTokens: number;
  byStatus: Record<string, number>;
  topProviders: Record<string, number>;
}

export interface ModelStats {
  provider: string;
  model: string;
  callCount: number;
  avgCost: number;
  avgInputTokens: number;
  avgLatencyMs: number;
  cacheReadTokens: number;
}

export async function fetchRuns(): Promise<Run[]> {
  const res = await fetch(`${getApiUrl()}/api/runs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRun(id: string): Promise<{ run: Run; stages: Stage[] } | null> {
  const res = await fetch(`${getApiUrl()}/api/runs/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProviders(): Promise<unknown[]> {
  const res = await fetch(`${getApiUrl()}/api/providers`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchStats(): Promise<RunStats> {
  const res = await fetch(`${getApiUrl()}/api/stats`, { cache: 'no-store' });
  if (!res.ok)
    return {
      totalRuns: 0,
      totalCost: 0,
      avgCost: 0,
      totalTokens: 0,
      byStatus: {},
      topProviders: {},
    };
  return res.json();
}

export async function fetchModelStats(): Promise<ModelStats[]> {
  const res = await fetch(`${getApiUrl()}/api/providers/stats`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}
