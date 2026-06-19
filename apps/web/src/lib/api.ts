// Browser uses the public URL; server-side Next.js uses the internal container URL
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const INTERNAL_API_URL = process.env.AGENTFORGE_INTERNAL_API_URL ?? PUBLIC_API_URL;

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
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
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
