import { randomUUID } from 'crypto';
import type {
  RunConfig,
  RunResult,
  StageResult,
  StageType,
  TaskType,
  BuildTask,
  RequirementsArtifact,
  ArchitectureArtifact,
  CodeDiffArtifact,
  TestArtifact,
  ReviewArtifact,
  DocArtifact,
  ModelInfo,
} from '@agentforge/shared';
import { BudgetExceededError, NoCapableModelError, logger } from '@agentforge/shared';
import { CacheAwareMessageBuilder } from '@agentforge/token-engine';
import { calculateCallCost, estimateCallCost } from '@agentforge/cost-engine';
import { TASK_CAPABILITIES } from '@agentforge/model-router';
import { compressLog } from '@agentforge/token-engine';
import type { OrchestratorConfig } from './config.js';
import type { AgentCall } from './agents/types.js';
import {
  intakeAgent,
  architectAgent,
  builderAgent,
  reviewerAgent,
  docAgent,
} from './agents/index.js';

export class Orchestrator {
  private lastBuilderProvider: string | undefined;
  private lastSuggestedTestCommand: string | undefined;

  constructor(private config: OrchestratorConfig) {}

  async run(userPrompt: string, runConfig: RunConfig): Promise<RunResult> {
    const runId = randomUUID();
    const startMs = Date.now();
    const stages: StageResult[] = [];

    logger.info(`Starting run ${runId}`, { userPrompt, budgetUsd: runConfig.budgetUsd });

    if (runConfig.dryRun) {
      logger.info('Dry-run mode: running intake + architect + task breakdown only');
      const requirements = await this.runIntake(userPrompt, stages);
      const architecture = await this.runArchitect(requirements, stages);
      const tasks = this.breakdownTasks(architecture);
      logger.info(`Dry-run plan: ${tasks.length} tasks identified`);
      logger.info('No files written, no commands run, no git commits.');
      return {
        id: runId,
        status: 'complete',
        userPrompt,
        stages,
        totalInputTokens: this.config.costTracker.totalInputTokens(),
        totalOutputTokens: this.config.costTracker.totalOutputTokens(),
        totalCostUsd: this.config.costTracker.totalCostUsd(),
        durationMs: Date.now() - startMs,
        outputPath: runConfig.outputDir,
      };
    }

    try {
      // Stage 1: Intake
      const requirements = await this.runIntake(userPrompt, stages);

      // Stage 2: Architecture
      const architecture = await this.runArchitect(requirements, stages);

      // Stage 3: Task Breakdown (no model call)
      const tasks = this.breakdownTasks(architecture);
      logger.info(`Task breakdown: ${tasks.length} tasks`);

      // Stage 4: Build Loop
      const allDiffs: CodeDiffArtifact[] = [];
      for (const task of tasks) {
        const diff = await this.runBuild(task, requirements, stages);
        allDiffs.push(diff);
        if (this.config.fileWriter) {
          await this.config.fileWriter.applyWrites(diff.files);
          await this.config.fileWriter.commitStage(
            `[agentforge] stage:build task:${task.id} run:${runId}`
          );
        }
      }

      // Stage 5: Test
      const testResult = await this.runTest(runConfig, stages);

      // Stage 6: Review
      const diffString = this.config.fileWriter
        ? await this.config.fileWriter.getDiff()
        : allDiffs.map((d) => d.explanation).join('\n');
      const review = await this.runReview(diffString, requirements, testResult, stages);

      // Stage 7: Repair Loop
      let finalTest = testResult;
      let finalReview = review;
      let repairIteration = 0;

      while (
        (finalTest.failed > 0 || finalReview.verdict === 'major') &&
        repairIteration < runConfig.maxRepairLoops
      ) {
        repairIteration++;
        logger.info(`Repair loop iteration ${repairIteration}/${runConfig.maxRepairLoops}`);

        const repairDiff = await this.runRepair(
          finalTest,
          finalReview,
          diffString,
          requirements,
          repairIteration,
          stages
        );

        if (this.config.fileWriter) {
          await this.config.fileWriter.applyWrites(repairDiff.files);
          await this.config.fileWriter.commitStage(
            `[agentforge] stage:repair iteration:${repairIteration} run:${runId}`
          );
          const newDiff = await this.config.fileWriter.getDiff();
          finalTest = await this.runTest(runConfig, stages, repairIteration);
          finalReview = await this.runReview(newDiff, requirements, finalTest, stages);
        } else {
          // No file writer — break after first repair to avoid infinite loop in tests
          break;
        }
      }

      // Stage 8: Documentation
      const fileTree = allDiffs.flatMap((d) => d.files.map((f) => f.path));
      const doc = await this.runDoc(requirements, architecture, fileTree, finalTest, stages);

      // Stage 9: Report
      const totalDurationMs = Date.now() - startMs;
      const result: RunResult = {
        id: runId,
        status: 'complete',
        userPrompt,
        stages,
        totalInputTokens: this.config.costTracker.totalInputTokens(),
        totalOutputTokens: this.config.costTracker.totalOutputTokens(),
        totalCostUsd: this.config.costTracker.totalCostUsd(),
        durationMs: totalDurationMs,
        outputPath: runConfig.outputDir,
      };

      logger.info(`Run ${runId} complete`, {
        totalCostUsd: result.totalCostUsd.toFixed(4),
        durationMs: totalDurationMs,
      });

      // Suppress unused variable warning for doc
      void doc;

      return result;
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        logger.warn(`Run ${runId} aborted: budget exceeded`);
        return this.makeFailedResult(
          runId,
          userPrompt,
          runConfig.outputDir,
          stages,
          Date.now() - startMs,
          'aborted'
        );
      }
      logger.error(`Run ${runId} failed`, err);
      return this.makeFailedResult(
        runId,
        userPrompt,
        runConfig.outputDir,
        stages,
        Date.now() - startMs,
        'failed'
      );
    }
  }

  private async callAgent<TInput, TOutput>(
    agent: AgentCall<TInput, TOutput>,
    input: TInput,
    stageType: StageType,
    iteration: number,
    stages: StageResult[]
  ): Promise<TOutput> {
    const userMessage = agent.buildUserMessage(input);

    // Build prompt via CacheAwareMessageBuilder
    const builder = new CacheAwareMessageBuilder()
      .addStable(agent.systemPrompt)
      .addVariable(userMessage);

    const estimatedTokens = builder.estimateTokens();

    // Route to best model — for review, try to use a different provider than the builder.
    // If no alternative provider is available, fall back to any available provider.
    const baseRouterRequest = {
      taskType: agent.taskType,
      estimatedInputTokens: estimatedTokens,
      requiredCapabilities: TASK_CAPABILITIES[agent.taskType],
      budgetRemainingUsd:
        this.config.budgetEnforcer.runLimitUsd - this.config.costTracker.totalCostUsd(),
    };

    let routerDecision;
    if (agent.taskType === 'review' && this.lastBuilderProvider !== undefined) {
      try {
        routerDecision = await this.config.router.route({
          ...baseRouterRequest,
          preferDifferentProviderFrom: this.lastBuilderProvider,
        });
      } catch (err) {
        if (err instanceof NoCapableModelError) {
          // No alternative provider available; fall back to any provider
          logger.info(
            `Review: no alternative provider to ${this.lastBuilderProvider}, falling back to same provider`
          );
          routerDecision = await this.config.router.route(baseRouterRequest);
        } else {
          throw err;
        }
      }
    } else {
      routerDecision = await this.config.router.route(baseRouterRequest);
    }

    const modelInfo = await this.getModelInfo(routerDecision.provider, routerDecision.model);

    const estimatedCost = estimateCallCost(modelInfo, estimatedTokens);

    // Budget checks
    this.config.budgetEnforcer.assertRunBudget(
      this.config.costTracker.totalCostUsd(),
      estimatedCost
    );

    if (!this.config.budgetEnforcer.isStageWithinBudget(agent.taskType, estimatedCost)) {
      const optionalStages: TaskType[] = ['doc', 'review', 'summarize'];
      if (optionalStages.includes(agent.taskType)) {
        logger.warn(
          `Stage ${stageType} skipped: per-stage budget exceeded (est. $${estimatedCost.toFixed(4)})`
        );
        stages.push({
          stage: stageType,
          iteration,
          status: 'skipped',
          provider: '',
          model: '',
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          durationMs: 0,
        });
        throw new Error(`STAGE_SKIPPED:${stageType}`);
      }
      // Required stage — this is a hard limit
      throw new BudgetExceededError(this.config.budgetEnforcer.runLimitUsd, estimatedCost);
    }

    logger.info(`Calling ${routerDecision.provider}/${routerDecision.model} for ${stageType}`, {
      reason: routerDecision.reason,
      estimatedTokens,
    });

    const { systemPrompt, messages } = builder.build(agent.systemPrompt);

    const startMs = Date.now();
    const provider = this.config.registry.get(routerDecision.provider);

    const maxTokens = this.config.budgetEnforcer.clampCallTokens(4096);

    const response = await provider.chat({
      model: routerDecision.model,
      messages,
      maxTokens,
      systemPrompt,
      responseFormat: 'json',
    });

    const durationMs = Date.now() - startMs;
    const cost = calculateCallCost(
      modelInfo,
      response.inputTokens,
      response.outputTokens,
      response.cacheReadTokens ?? 0,
      response.cacheWriteTokens ?? 0
    );

    this.config.costTracker.record({
      stage: stageType,
      iteration,
      provider: routerDecision.provider,
      model: routerDecision.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      cacheReadTokens: response.cacheReadTokens ?? 0,
      cacheWriteTokens: response.cacheWriteTokens ?? 0,
      costUsd: cost.totalCostUsd,
      durationMs,
    });

    // Track which provider built code (for reviewer cross-provider selection)
    if (agent.taskType === 'build' || agent.taskType === 'repair') {
      this.lastBuilderProvider = routerDecision.provider;
    }

    stages.push({
      stage: stageType,
      iteration,
      status: 'complete',
      provider: routerDecision.provider,
      model: routerDecision.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      costUsd: cost.totalCostUsd,
      durationMs,
    });

    return agent.parseResponse(response.content);
  }

  private async getModelInfo(provider: string, model: string): Promise<ModelInfo> {
    const allModels = await this.config.registry.getAllModels();
    const found = allModels.find((m) => m.id === model && m.provider === provider);
    if (found) return found;
    // Fallback with zero cost
    return {
      id: model,
      provider,
      contextWindow: 32000,
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      capabilities: ['code', 'json'],
      maxOutputTokens: 4096,
    };
  }

  private async runIntake(
    userPrompt: string,
    stages: StageResult[]
  ): Promise<RequirementsArtifact> {
    const requirements = await this.callAgent(intakeAgent, { userPrompt }, 'intake', 0, stages);
    this.lastSuggestedTestCommand = requirements.suggestedTestCommand;
    return requirements;
  }

  private async runArchitect(
    requirements: RequirementsArtifact,
    stages: StageResult[]
  ): Promise<ArchitectureArtifact> {
    return this.callAgent(architectAgent, requirements, 'architect', 0, stages);
  }

  breakdownTasks(architecture: ArchitectureArtifact): BuildTask[] {
    if (architecture.buildOrder.length > 0) {
      return architecture.buildOrder.map((filePath, i) => ({
        id: `task-${i + 1}`,
        description: `Create ${filePath}`,
        files: [filePath],
        dependsOn: i > 0 ? [`task-${i}`] : [],
      }));
    }
    // Fallback: one task per fileTree entry
    return architecture.fileTree.map((node, i) => ({
      id: `task-${i + 1}`,
      description: `Create ${node.path}`,
      files: [node.path],
      dependsOn: i > 0 ? [`task-${i}`] : [],
    }));
  }

  private async runBuild(
    task: BuildTask,
    requirements: RequirementsArtifact,
    stages: StageResult[]
  ): Promise<CodeDiffArtifact> {
    let contextPack: string | undefined;

    // Wire context engine if available
    if (this.config.contextEngine && this.config.fileWriter?.listFiles) {
      try {
        const files = await this.config.fileWriter.listFiles();
        const pack = await this.config.contextEngine.buildContextPack(
          files as Parameters<typeof this.config.contextEngine.buildContextPack>[0],
          task.description
        );
        contextPack = this.config.contextEngine.formatForPrompt(pack);
      } catch {
        // Context engine failure is non-fatal — fall back to clarifiedGoal
      }
    }

    return this.callAgent(
      builderAgent,
      { task, contextSummary: requirements.clarifiedGoal, contextPack },
      'build',
      0,
      stages
    );
  }

  private async runTest(
    runConfig: RunConfig,
    stages: StageResult[],
    iteration = 0
  ): Promise<TestArtifact> {
    if (this.config.testRunner) {
      const testCommand =
        runConfig.testCommand ?? this.lastSuggestedTestCommand ?? 'npx vitest run';
      return this.config.testRunner.run(testCommand);
    }
    // Stub: no test runner available
    const stub: TestArtifact = {
      passed: 0,
      failed: 0,
      errors: 0,
      compressedLog: '(test runner not available in Phase 5)',
      rawExitCode: 0,
      testCommand: 'stub',
    };
    stages.push({
      stage: 'test',
      iteration,
      status: 'complete',
      provider: '',
      model: '',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: 0,
    });
    return stub;
  }

  private async runReview(
    diff: string,
    requirements: RequirementsArtifact,
    testResult: TestArtifact,
    stages: StageResult[]
  ): Promise<ReviewArtifact> {
    try {
      return await this.callAgent(
        reviewerAgent,
        { diff, requirements, testResult },
        'review',
        0,
        stages
      );
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('STAGE_SKIPPED:')) {
        return {
          issues: [],
          verdict: 'pass',
          suggestions: ['Review skipped: budget limit reached'],
        };
      }
      throw err;
    }
  }

  private async runRepair(
    testResult: TestArtifact,
    review: ReviewArtifact,
    diff: string,
    requirements: RequirementsArtifact,
    iteration: number,
    stages: StageResult[]
  ): Promise<CodeDiffArtifact> {
    const issuesSummary = review.issues
      .map((i) => `[${i.severity}] ${i.file}: ${i.message}`)
      .join('\n');

    const repairContext = compressLog(
      [
        `=== Test Output ===`,
        testResult.compressedLog,
        `=== Review Issues ===`,
        issuesSummary,
        `=== Original Diff Summary ===`,
        diff.slice(0, 1000),
      ].join('\n')
    );

    const repairTask: BuildTask = {
      id: `repair-${iteration}`,
      description: `Repair: fix ${testResult.failed} failing tests and ${review.issues.length} review issues`,
      files: review.issues.map((i) => i.file).filter((f) => f.length > 0),
      dependsOn: [],
    };

    const contextSummary = requirements.clarifiedGoal;

    // Use builderAgent with repair taskType override via a repair-specific agent wrapper
    const repairAgent = {
      ...builderAgent,
      taskType: 'repair' as const,
    };

    return this.callAgent(
      repairAgent,
      { task: repairTask, contextSummary, repairContext },
      'repair',
      iteration,
      stages
    );
  }

  private async runDoc(
    requirements: RequirementsArtifact,
    architecture: ArchitectureArtifact,
    fileTree: string[],
    testResult: TestArtifact,
    stages: StageResult[]
  ): Promise<DocArtifact> {
    try {
      return await this.callAgent(
        docAgent,
        { requirements, architecture, fileTree, testResult },
        'doc',
        0,
        stages
      );
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('STAGE_SKIPPED:')) {
        return { readme: '', changelog: '', inlineDocs: [] };
      }
      throw err;
    }
  }

  private makeFailedResult(
    runId: string,
    userPrompt: string,
    outputPath: string,
    stages: StageResult[],
    durationMs: number,
    status: 'failed' | 'aborted'
  ): RunResult {
    return {
      id: runId,
      status,
      userPrompt,
      stages,
      totalInputTokens: this.config.costTracker.totalInputTokens(),
      totalOutputTokens: this.config.costTracker.totalOutputTokens(),
      totalCostUsd: this.config.costTracker.totalCostUsd(),
      durationMs,
      outputPath,
    };
  }
}
