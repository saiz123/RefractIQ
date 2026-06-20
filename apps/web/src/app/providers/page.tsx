export const dynamic = 'force-dynamic';

import { fetchProviders, fetchModelStats } from '@/lib/api';
import type { ModelStats } from '@/lib/api';

export default async function ProvidersPage() {
  let providers: Array<{ id: string; type: string; name: string; endpoint?: string }> = [];
  let modelStats: ModelStats[] = [];
  let error: string | null = null;
  try {
    const [rawProviders, fetchedModelStats] = await Promise.all([
      fetchProviders().catch(() => []),
      fetchModelStats().catch(() => [] as ModelStats[]),
    ]);
    providers = rawProviders as Array<{
      id: string;
      type: string;
      name: string;
      endpoint?: string;
    }>;
    modelStats = fetchedModelStats;
  } catch {
    error = 'Could not connect to RefractIQ API.';
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Providers</h1>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {providers.length === 0 && !error ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No providers configured</p>
          <p className="text-sm">
            Run <code className="bg-gray-800 px-1.5 py-0.5 rounded">refractiq providers add</code>{' '}
            to add one
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {providers.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {p.type} · {p.endpoint ?? 'default endpoint'}
                  </p>
                </div>
                <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded font-mono">
                  {p.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modelStats.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Provider Performance</h2>
          <p className="text-gray-500 text-sm mb-4">Based on your run history</p>
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">
                    Provider / Model
                  </th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Calls</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Avg Cost</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Avg Latency</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Cache Hits</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.map((m) => (
                  <tr
                    key={`${m.provider}/${m.model}`}
                    className="border-b border-gray-800 hover:bg-gray-900/50"
                  >
                    <td className="px-4 py-3">
                      <span className="text-gray-300">{m.provider}</span>
                      <span className="text-gray-500 text-xs ml-2 font-mono">{m.model}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{m.callCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">
                      ${m.avgCost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {m.avgLatencyMs.toLocaleString()}ms
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400">
                      {m.cacheReadTokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
