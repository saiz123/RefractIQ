import type { FileEntry, ScoredFile } from './types.js';

/**
 * Score a file's relevance to a task description.
 *
 * Scoring factors (additive):
 * 1. Keyword overlap: extract words from taskDescription (≥4 chars), count how many appear in file path or content
 *    +10 per keyword found in path, +2 per keyword found in content (capped at +40 for content)
 * 2. Import match: if taskDescription mentions a filename stem and the file imports it → +15
 * 3. Extension bonus: +5 for .ts/.js/.py/.go/.rs files (code files are more relevant than config)
 * 4. Path match: if any keyword appears in the file path → already covered by keyword scoring
 * 5. Recency bonus: +3 if lastModifiedMs is within the last hour (recently changed files are more relevant)
 *
 * Returns score of 0 for completely irrelevant files.
 */
export function scoreFile(file: FileEntry, taskDescription: string): ScoredFile {
  const reasons: string[] = [];
  let score = 0;

  const keywords = extractKeywords(taskDescription);
  const pathLower = file.path.toLowerCase();
  const contentLower = file.content.toLowerCase();

  // Keyword matching in path
  for (const kw of keywords) {
    if (pathLower.includes(kw)) {
      score += 10;
      reasons.push(`keyword in path: "${kw}"`);
    }
  }

  // Keyword matching in content (capped)
  let contentScore = 0;
  for (const kw of keywords) {
    if (contentLower.includes(kw)) {
      contentScore += 2;
      if (contentScore <= 40) {
        reasons.push(`keyword in content: "${kw}"`);
      }
    }
  }
  score += Math.min(contentScore, 40);

  // Extension bonus
  const codeExts = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.cs'];
  if (codeExts.some((ext) => file.path.endsWith(ext))) {
    score += 5;
    reasons.push('code file bonus');
  }

  // Recency bonus
  if (file.lastModifiedMs && Date.now() - file.lastModifiedMs < 3_600_000) {
    score += 3;
    reasons.push('recently modified');
  }

  return { file, score, reasons };
}

/**
 * Extract meaningful keywords from a task description.
 * Filters out common stop words and short tokens.
 */
export function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'has',
    'her',
    'was',
    'one',
    'our',
    'out',
    'day',
    'get',
    'has',
    'him',
    'his',
    'how',
    'man',
    'new',
    'now',
    'old',
    'see',
    'two',
    'way',
    'who',
    'boy',
    'did',
    'its',
    'let',
    'put',
    'say',
    'she',
    'too',
    'use',
    'with',
    'that',
    'this',
    'from',
    'they',
    'will',
    'what',
    'when',
    'make',
    'like',
    'into',
    'time',
    'have',
    'more',
    'create',
    'implement',
    'write',
    'build',
    'file',
    'function',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // dedupe
}
