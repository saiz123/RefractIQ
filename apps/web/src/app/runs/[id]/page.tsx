export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchRun } from '@/lib/api';

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchRun(id).catch(() => null);
  if (!data) notFound();

  const { run, stages } = data;
  const modelStages = stages.filter((s) => s.provider);

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to runs
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-bold mb-1 text-white">{run.userPrompt}</h1>
        <p className="text-gray-500 text-sm font-mono">{run.id}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Status', value: run.status },
          { label: 'Total Cost', value: `$${run.totalCostUsd.toFixed(4)}` },
          { label: 'Input Tokens', value: run.totalInputTokens.toLocaleString() },
          { label: 'Output Tokens', value: run.totalOutputTokens.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">{label}</p>
            <p className="text-white font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">Stage Breakdown</h2>
      {(() => {
        const maxCost = Math.max(...modelStages.map((s) => s.costUsd), 0);
        const minCost = Math.min(...modelStages.map((s) => s.costUsd), Infinity);
        return (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Stage</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Provider</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Model</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">In Tokens</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Out Tokens</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelStages.map((stage) => {
                  const label =
                    stage.iteration > 0 ? `${stage.stage}[${stage.iteration}]` : stage.stage;
                  const costClass =
                    stage.costUsd === maxCost && maxCost > 0
                      ? 'text-amber-400'
                      : stage.costUsd === minCost && minCost < maxCost
                        ? 'text-green-400'
                        : 'text-green-400';
                  return (
                    <tr key={stage.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                      <td className="px-4 py-3 font-mono text-blue-300">{label}</td>
                      <td className="px-4 py-3 text-gray-300">{stage.provider}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{stage.model}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {stage.inputTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {stage.outputTokens.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${costClass}`}>
                        ${stage.costUsd.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 border-t border-gray-700">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-gray-300">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-200">
                    {run.totalInputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-200">
                    {run.totalOutputTokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-300">
                    ${run.totalCostUsd.toFixed(4)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })()}

      {/* Agent Timeline */}
      {modelStages.length > 0 &&
        (() => {
          const totalDuration =
            modelStages.reduce((s, st) => s + ((st.endedAt ?? st.startedAt) - st.startedAt), 0) ||
            1;
          const stageColors: Record<string, string> = {
            intake: 'bg-blue-700',
            architect: 'bg-violet-700',
            'task-breakdown': 'bg-violet-500',
            build: 'bg-emerald-700',
            test: 'bg-cyan-700',
            review: 'bg-amber-700',
            repair: 'bg-rose-700',
            doc: 'bg-pink-700',
          };
          return (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-3">Agent Timeline</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="space-y-2">
                  {modelStages.map((stage) => {
                    const duration = (stage.endedAt ?? stage.startedAt) - stage.startedAt;
                    const widthPct = Math.max(2, (duration / totalDuration) * 100);
                    const label =
                      stage.iteration > 0 ? `${stage.stage}[${stage.iteration}]` : stage.stage;
                    const color = stageColors[stage.stage] ?? 'bg-gray-700';
                    return (
                      <div key={stage.id} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 shrink-0 text-right">
                          {label}
                        </span>
                        <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                          <div
                            className={`h-full ${color} rounded flex items-center px-2`}
                            style={{ width: `${widthPct}%` }}
                          >
                            <span className="text-xs text-white/80 truncate">
                              {duration.toLocaleString()}ms
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-20 shrink-0">
                          ${stage.costUsd.toFixed(4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
