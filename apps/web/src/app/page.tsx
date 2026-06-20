export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { fetchRuns, fetchStats } from '@/lib/api';
import type { Run, RunStats } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    aborted: 'bg-yellow-900 text-yellow-300',
    running: 'bg-blue-900 text-blue-300',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}
    >
      {status}
    </span>
  );
}

export default async function HomePage() {
  let runs: Run[] = [];
  let stats: RunStats | null = null;
  let error: string | null = null;
  try {
    [runs, stats] = await Promise.all([
      fetchRuns().catch(() => [] as Run[]),
      fetchStats().catch(() => null),
    ]);
  } catch {
    error = 'Could not connect to AgentForge API. Is "agentforge serve" running?';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Run History</h1>
        <span className="text-sm text-gray-500">{runs.length} runs</span>
      </div>

      {stats && stats.totalRuns > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Runs', value: String(stats.totalRuns) },
            { label: 'Total Spent', value: `$${stats.totalCost.toFixed(4)}` },
            { label: 'Avg per Run', value: `$${stats.avgCost.toFixed(4)}` },
            { label: 'Total Tokens', value: stats.totalTokens.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className="text-white font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {runs.length === 0 && !error ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No runs yet</p>
          <p className="text-sm">
            Run{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded">
              agentforge build &quot;your idea&quot;
            </code>{' '}
            to get started
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Prompt</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Tokens In</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Tokens Out</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Cost</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <tr
                  key={run.id}
                  className={`border-b border-gray-800 hover:bg-gray-900 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/30'}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/runs/${run.id}`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {run.userPrompt.slice(0, 60)}
                      {run.userPrompt.length > 60 ? '…' : ''}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono">
                    {run.totalInputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono">
                    {run.totalOutputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono">
                    ${run.totalCostUsd.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
