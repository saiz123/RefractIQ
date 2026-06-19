/**
 * Safely parse an agent's JSON response.
 * Strips markdown code fences (```json ... ```) that models sometimes add.
 * Throws a clear error on invalid JSON.
 * Optionally validates that required keys are present in the parsed object.
 */
export function safeParseAgentJson<T>(raw: string, requiredKeys?: ReadonlyArray<string>): T {
  let cleaned = raw.trim();
  // Strip leading code fence (```json or ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  let parsed: T;
  try {
    parsed = JSON.parse(cleaned) as T;
  } catch (err) {
    const preview = cleaned.slice(0, 200);
    throw new Error(`Failed to parse agent JSON response: ${err instanceof Error ? err.message : String(err)}\nPreview: ${preview}`);
  }

  if (requiredKeys) {
    for (const key of requiredKeys) {
      if (!(key in (parsed as object))) {
        throw new Error(`Agent response missing required field: "${key}". Got: ${JSON.stringify(Object.keys(parsed as object))}`);
      }
    }
  }

  return parsed;
}
