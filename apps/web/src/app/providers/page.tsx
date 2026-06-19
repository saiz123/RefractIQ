export const dynamic = 'force-dynamic';

import { fetchProviders } from '@/lib/api';

export default async function ProvidersPage() {
  let providers: Array<{ id: string; type: string; name: string; endpoint?: string }> = [];
  let error: string | null = null;
  try {
    providers = (await fetchProviders()) as typeof providers;
  } catch {
    error = 'Could not connect to AgentForge API.';
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
            Run <code className="bg-gray-800 px-1.5 py-0.5 rounded">agentforge providers add</code>{' '}
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
    </div>
  );
}
