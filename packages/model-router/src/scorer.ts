import type { ModelInfo } from '@refractiq/shared';
import type { RouterRequest, TaskTier } from '@refractiq/shared';
import { TASK_TIERS } from './tiers.js';

/**
 * Determine the cost tier of a model based on its input cost.
 * Cheap: inputCostPer1M < 0.20
 * Mid:   inputCostPer1M 0.20–2.00 (inclusive on both ends)
 * Strong: inputCostPer1M > 2.00
 */
function getModelTier(model: ModelInfo): TaskTier {
  if (model.inputCostPer1M < 0.2) return 'cheap';
  if (model.inputCostPer1M <= 2.0) return 'mid';
  return 'strong';
}

/**
 * Score a ModelInfo for a given RouterRequest.
 * Returns -1 if the model is ineligible (missing required capabilities).
 * Higher scores are better candidates.
 */
export function scoreModel(model: ModelInfo, request: RouterRequest): number {
  // Check all required capabilities are present
  for (const cap of request.requiredCapabilities) {
    if (!model.capabilities.includes(cap)) {
      return -1;
    }
  }

  const taskTier = TASK_TIERS[request.taskType];
  const modelTier = getModelTier(model);

  let score = 0;

  // Tier bonus
  if (modelTier === 'cheap') {
    if (taskTier === 'cheap') score += 100;
    else if (taskTier === 'mid') score += 50;
    else score += 0; // strong task
  } else if (modelTier === 'mid') {
    if (taskTier === 'cheap') score += 0;
    else if (taskTier === 'mid') score += 100;
    else score += 50; // strong task
  } else {
    // strong model
    if (taskTier === 'cheap') score -= 50;
    else if (taskTier === 'mid') score += 50;
    else score += 100; // strong task
  }

  // Cost bonus: cheaper models score higher within same tier
  score -= model.inputCostPer1M * 10;

  // Context window bonus: modest bonus for larger windows (tiebreaker)
  score += Math.min(model.contextWindow / 100_000, 5);

  // Latency tiebreaker: -1 point per 2000ms of average latency (small penalty, doesn't override cost)
  if (request.averageLatencyByModel) {
    const avgLatency = request.averageLatencyByModel[model.id];
    if (avgLatency !== undefined && avgLatency > 0) {
      score -= Math.floor(avgLatency / 2000);
    }
  }

  return score;
}
