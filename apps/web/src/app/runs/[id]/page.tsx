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
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to runs</Link>
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
              const label = stage.iteration > 0 ? `${stage.stage}[${stage.iteration}]` : stage.stage;
              return (
                <tr key={stage.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-mono text-blue-300">{label}</td>
                  <td className="px-4 py-3 text-gray-300">{stage.provider}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{stage.model}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">{stage.inputTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">{stage.outputTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-400">${stage.costUsd.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-900 border-t border-gray-700">
              <td colSpan={3} className="px-4 py-3 font-semibold text-gray-300">Total</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-200">{run.totalInputTokens.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-200">{run.totalOutputTokens.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-green-300">${run.totalCostUsd.toFixed(4)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
