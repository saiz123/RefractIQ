/**
 * Safely parse an agent's JSON response.
 * Strips markdown code fences (```json ... ```) that models sometimes add.
 * Throws a clear error on invalid JSON.
 */
export function safeParseAgentJson<T>(raw: string): T {
  let cleaned = raw.trim();
  // Strip leading code fence (```json or ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  // Strip trailing code fence
  cleaned = cleaned.replace(/\s*```\s*$/i, '');
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const preview = cleaned.slice(0, 200);
    throw new Error(`Failed to parse agent JSON response: ${err instanceof Error ? err.message : String(err)}\nPreview: ${preview}`);
  }
}
