import type {
  RouterRequest,
  RouterDecision,
  TaskType,
  TaskTier,
  ModelInfo,
} from '@refractiq/shared';
import { NoCapableModelError } from '@refractiq/shared';
import type { ProviderRegistry } from '@refractiq/providers';
import { estimateCallCost } from '@refractiq/cost-engine';
import { TASK_TIERS } from './tiers.js';
import { scoreModel } from './scorer.js';

interface ScoredModel {
  model: ModelInfo;
  score: number;
}

export class ModelRouter {
  constructor(private registry: ProviderRegistry) {}

  /**
   * Route a request to the best model given the router request parameters.
   * Throws NoCapableModelError if no suitable model is found.
   */
  async route(request: RouterRequest): Promise<RouterDecision> {
    // Step 1: Get all models and available providers
    const allModels = await this.registry.getAllModels();
    const availableAdapters = await this.registry.listAvailable();
    const availableProviderIds = new Set(availableAdapters.map((a) => a.id));

    // Step 4: Handle userPreferredModel override (bypass capability/availability filters except provider availability)
    if (request.userPreferredModel !== undefined) {
      const preferredModel = allModels.find((m) => m.id === request.userPreferredModel);
      if (preferredModel !== undefined && availableProviderIds.has(preferredModel.provider)) {
        const estimatedCostUsd = estimateCallCost(preferredModel, request.estimatedInputTokens);
        const tier = this.getTierForTask(request.taskType);
        const score = scoreModel(preferredModel, request);
        return {
          provider: preferredModel.provider,
          model: preferredModel.id,
          estimatedCostUsd,
          reason: `Selected ${preferredModel.provider}/${preferredModel.id} for task '${request.taskType}' (${tier} tier, score: ${score}, est. cost: $${estimatedCostUsd.toFixed(4)}) [user model override]`,
        };
      }
    }

    // Step 3: Filter models
    let candidates: ScoredModel[] = [];
    const triedProviders = new Set<string>();

    for (const model of allModels) {
      // Only models from available providers
      if (!availableProviderIds.has(model.provider)) continue;

      triedProviders.add(model.provider);

      // Context window must fit the estimated input
      if (model.contextWindow < request.estimatedInputTokens) continue;

      // Exclude preferred-different-from provider
      if (
        request.preferDifferentProviderFrom !== undefined &&
        model.provider === request.preferDifferentProviderFrom
      ) {
        continue;
      }

      // Score the model (returns -1 if missing required capabilities)
      const score = scoreModel(model, request);
      if (score === -1) continue;

      candidates.push({ model, score });
    }

    // Step 5: If userPreferredProvider set (and no model override), restrict to that provider
    if (request.userPreferredProvider !== undefined) {
      candidates = candidates.filter((c) => c.model.provider === request.userPreferredProvider);
    }

    // Step 6: Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Step 6b: Pre-filter by budget — exclude models whose estimated cost exceeds remaining budget
    // Fall back to all candidates if budget filter removes everything
    if (request.budgetRemainingUsd > 0) {
      const withinBudget = candidates.filter(({ model }) => {
        const est = estimateCallCost(model, request.estimatedInputTokens);
        return est <= request.budgetRemainingUsd;
      });
      if (withinBudget.length > 0) {
        candidates = withinBudget;
      }
    }

    // Step 7: No candidates → throw
    if (candidates.length === 0) {
      throw new NoCapableModelError(request.taskType, Array.from(triedProviders));
    }

    // Step 8: Pick top candidate
    const best = candidates[0];
    const { model } = best;

    // Step 9: Calculate cost
    const estimatedCostUsd = estimateCallCost(model, request.estimatedInputTokens);

    // Step 10: Return RouterDecision
    const tier = this.getTierForTask(request.taskType);
    return {
      provider: model.provider,
      model: model.id,
      estimatedCostUsd,
      reason: `Selected ${model.provider}/${model.id} for task '${request.taskType}' (${tier} tier, score: ${best.score}, est. cost: $${estimatedCostUsd.toFixed(4)})`,
    };
  }

  /** Returns the tier for a given task type. */
  getTierForTask(taskType: TaskType): TaskTier {
    return TASK_TIERS[taskType];
  }
}
