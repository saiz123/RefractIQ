import { describe, it, expect } from 'vitest';
import { BudgetEnforcer, DEFAULT_BUDGET_CONFIG } from '../budget.js';
import { BudgetExceededError } from '@refractiq/shared';

describe('BudgetEnforcer', () => {
  const enforcer = new BudgetEnforcer(DEFAULT_BUDGET_CONFIG);

  describe('clampCallTokens', () => {
    it('returns requestedTokens when under maxCallInputTokens', () => {
      expect(enforcer.clampCallTokens(1000)).toBe(1000);
    });

    it('returns maxCallInputTokens when requestedTokens exceeds limit', () => {
      expect(enforcer.clampCallTokens(999_999)).toBe(DEFAULT_BUDGET_CONFIG.maxCallInputTokens);
    });
  });

  describe('isStageWithinBudget', () => {
    it('returns true when cost is within the intake stage limit (0.01 < 0.05)', () => {
      expect(enforcer.isStageWithinBudget('intake', 0.01)).toBe(true);
    });

    it('returns false when cost exceeds the intake stage limit (0.10 > 0.05)', () => {
      expect(enforcer.isStageWithinBudget('intake', 0.1)).toBe(false);
    });

    it('returns true when cost is within the build stage limit (0.19 < 0.20)', () => {
      expect(enforcer.isStageWithinBudget('build', 0.19)).toBe(true);
    });

    it('returns true for a task type with no configured limit', () => {
      // Create an enforcer with no perStageUsd entries
      const e = new BudgetEnforcer({
        maxCallInputTokens: 32_000,
        perStageUsd: {},
        runLimitUsd: 1.0,
      });
      expect(e.isStageWithinBudget('build', 999)).toBe(true);
    });
  });

  describe('assertRunBudget', () => {
    it('does not throw when projected spend is within run limit (0.40 + 0.05 = 0.45 < 0.50)', () => {
      expect(() => enforcer.assertRunBudget(0.4, 0.05)).not.toThrow();
    });

    it('throws BudgetExceededError when projected spend exceeds run limit (0.45 + 0.10 = 0.55 > 0.50)', () => {
      expect(() => enforcer.assertRunBudget(0.45, 0.1)).toThrow(BudgetExceededError);
    });

    it('thrown BudgetExceededError has correct limitUsd', () => {
      let caught: BudgetExceededError | null = null;
      try {
        enforcer.assertRunBudget(0.45, 0.1);
      } catch (e) {
        caught = e as BudgetExceededError;
      }
      expect(caught).not.toBeNull();
      expect(caught!.limitUsd).toBe(0.5);
    });

    it('thrown BudgetExceededError has correct estimatedUsd', () => {
      let caught: BudgetExceededError | null = null;
      try {
        enforcer.assertRunBudget(0.45, 0.1);
      } catch (e) {
        caught = e as BudgetExceededError;
      }
      expect(caught).not.toBeNull();
      expect(caught!.estimatedUsd).toBeCloseTo(0.55, 10);
    });
  });

  describe('getters', () => {
    it('runLimitUsd returns configured value', () => {
      expect(enforcer.runLimitUsd).toBe(DEFAULT_BUDGET_CONFIG.runLimitUsd);
    });

    it('maxCallInputTokens returns configured value', () => {
      expect(enforcer.maxCallInputTokens).toBe(DEFAULT_BUDGET_CONFIG.maxCallInputTokens);
    });
  });
});
